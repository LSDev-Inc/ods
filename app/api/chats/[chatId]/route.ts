import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "../../../../lib/http";
import { dbConnect } from "../../../../db/connection";
import { Chat, Message, Request, Report } from "../../../../db/models";
import { getSessionFromRequest } from "../../../../lib/auth/request";
import type { ChatStatus } from "../../../../db/models/Chat";
import { snapshotProduct } from "../../../../lib/products/serializer";
import { resolveMediaRef } from "../../../../lib/media";
import { encryptDate, encryptNumber, encryptString } from "../../../../lib/crypto/data";

function isExpired(
  status: ChatStatus,
  completedAt?: Date | null,
  expiresAt?: Date | null
) {
  if (status !== "completed") return false;
  const expiry =
    expiresAt?.getTime() ?? (completedAt ? completedAt.getTime() + 10 * 60 * 1000 : null);
  if (!expiry) return false;
  return Date.now() > expiry;
}

async function maybeExpireAndDelete(chatId: string) {
  await dbConnect();
  const chat = await Chat.findById(chatId);
  if (!chat) return null;

  if (isExpired(chat.status as ChatStatus, chat.completedAt || undefined, chat.expiresAt || undefined)) {
    await Message.deleteMany({ chatId: chat._id });
    await Chat.deleteOne({ _id: chat._id });
    return null;
  }

  return chat;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) return jsonError("Non autorizzato", 401);

  const chat = await maybeExpireAndDelete(chatId);
  if (!chat) return jsonError("Chat non trovata", 404);

  if (session.role === "user" && chat.userId.toString() !== session.sub) {
    return jsonError("Non autorizzato", 403);
  }
  if (session.role === "admin" && chat.lockedToAdminId?.toString() !== session.sub) {
    return jsonError("Non autorizzato", 403);
  }

  const requestDoc = await Request.findById(chat.requestId)
    .populate("products.productId")
    .lean();
  if (!requestDoc || Array.isArray(requestDoc)) return jsonError("Richiesta non trovata", 404);

  const products = requestDoc.products
    ? await Promise.all(
        requestDoc.products.map(async (p: any) => {
          const product = p.productId as any;
          const snapshot = await snapshotProduct(product);
          const imageUrl = resolveMediaRef(snapshot.imageRef).url ?? "";
          return {
            id: String(product?._id ?? p.productId),
            name: snapshot.name,
            imageUrl,
            price: snapshot.price,
            quantity: p.quantity ?? 0
          };
        })
      )
    : [];

  return jsonOk({
    id: String(chat._id),
    status: chat.status as ChatStatus,
    completedAt: chat.completedAt,
    requestStatus: requestDoc.status,
    products
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) return jsonError("Non autorizzato", 401);
  if (session.role === "user") return jsonError("Non autorizzato", 403);

  await dbConnect();
  const chat = await Chat.findById(chatId).lean();
  if (!chat || Array.isArray(chat)) return jsonError("Chat non trovata", 404);

  if (isExpired(chat.status as ChatStatus, chat.completedAt || undefined, chat.expiresAt || undefined)) {
    await Message.deleteMany({ chatId: chat._id });
    await Chat.deleteOne({ _id: chat._id });
    return jsonError("Chat non trovata", 404);
  }

  if (session.role === "admin" && chat.lockedToAdminId?.toString() !== session.sub) {
    return jsonError("Non autorizzato", 403);
  }

  await Message.deleteMany({ chatId: chat._id });
  await Chat.deleteOne({ _id: chat._id });

  return jsonOk({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) return jsonError("Non autorizzato", 401);
  if (session.role === "user") return jsonError("Non autorizzato", 403);

  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (action !== "complete") {
    return jsonError("Azione non valida", 400);
  }

  await dbConnect();
  const chat = await Chat.findById(chatId);
  if (!chat) return jsonError("Chat non trovata", 404);

  if (isExpired(chat.status as ChatStatus, chat.completedAt || undefined, chat.expiresAt || undefined)) {
    await Message.deleteMany({ chatId: chat._id });
    await Chat.deleteOne({ _id: chat._id });
    return jsonError("Chat non trovata", 404);
  }

  if (session.role === "admin" && chat.lockedToAdminId?.toString() !== session.sub) {
    return jsonError("Non autorizzato", 403);
  }

  if (chat.status === "completed") {
    return jsonOk({ status: chat.status, completedAt: chat.completedAt });
  }

  chat.status = "completed";
  const completedAt = new Date();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  chat.completedAt = completedAt;
  chat.expiresAt = expiresAt;
  await chat.save();
  await Message.updateMany({ chatId: chat._id }, { $set: { expiresAt } });

  // Crea un report persistente per i resoconti
  const requestDoc = await Request.findById(chat.requestId)
    .populate("products.productId")
    .lean();
  if (requestDoc && !Array.isArray(requestDoc)) {
    const products = requestDoc.products
      ? await Promise.all(
          requestDoc.products.map(async (p: any) => {
            const product = p.productId as any;
            const snapshot = await snapshotProduct(product);
            const priceAtSale = snapshot.price ?? 0;
            return {
              productId: product?._id ?? p.productId,
              name: await encryptString(snapshot.name || "Prodotto"),
              imageUrl: await encryptString(snapshot.imageRef ?? ""),
              quantity: p.quantity ?? 0,
              priceAtSale,
              priceAtSaleEncrypted: await encryptNumber(priceAtSale)
            };
          })
        )
      : [];
    const total = products.reduce(
      (sum: number, p: { priceAtSale: number; quantity: number }) =>
        sum + (p.priceAtSale || 0) * (p.quantity || 0),
      0
    );
    await Report.create({
      userId: requestDoc.userId,
      requestId: requestDoc._id,
      chatId: chat._id,
      products: products.map((p) => ({
        productId: p.productId,
        name: p.name,
        imageUrl: p.imageUrl,
        quantity: p.quantity,
        priceAtSale: p.priceAtSaleEncrypted
      })),
      total: await encryptNumber(total),
      createdAt: await encryptDate(new Date())
    });
  }

  return jsonOk({ status: chat.status, completedAt: chat.completedAt });
}
