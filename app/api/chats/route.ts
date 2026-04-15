import { NextRequest } from "next/server";
import { dbConnect } from "../../../db/connection";
import { Chat, Message, Request } from "../../../db/models";
import { getSessionFromRequest } from "../../../lib/auth/request";
import { jsonError, jsonOk } from "../../../lib/http";
import type { ChatStatus } from "../../../db/models/Chat";
import { snapshotProduct } from "../../../lib/products/serializer";
import { resolveMediaRef } from "../../../lib/media";
import { decryptDateToISOString } from "../../../lib/crypto/data";

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

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return jsonError("Non autorizzato", 401);

  await dbConnect();

  let chats;
  if (session.role === "user") {
    chats = await Chat.find({ userId: session.sub }).lean();
  } else if (session.role === "admin") {
    chats = await Chat.find({ lockedToAdminId: session.sub }).lean();
  } else {
    chats = await Chat.find({}).lean();
  }

  const expiredIds = chats
    .filter((chat) =>
      isExpired(chat.status as ChatStatus, chat.completedAt || undefined, chat.expiresAt || undefined)
    )
    .map((chat) => chat._id as any);

  if (expiredIds.length > 0) {
    await Message.deleteMany({ chatId: { $in: expiredIds } });
    await Chat.deleteMany({ _id: { $in: expiredIds } });
    const expiredSet = new Set(expiredIds.map((id: any) => String(id)));
    chats = chats.filter((chat) => !expiredSet.has(String(chat._id)));
  }

  if (!chats.length) {
    return jsonOk([]);
  }

  const requestIds = chats.map((chat) => chat.requestId);
  const requests = await Request.find({ _id: { $in: requestIds } })
    .populate("products.productId")
    .lean();
  const requestMap = new Map(requests.map((req) => [String(req._id), req]));

  const payload = await Promise.all(
    chats.map(async (chat) => {
      const req = requestMap.get(chat.requestId.toString());
      const products =
        req?.products
          ? await Promise.all(
              req.products.map(async (p: any) => {
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
      return {
        id: String(chat._id),
        requestId: String(chat.requestId),
        userId: String(chat.userId),
        adminId: chat.adminId ? String(chat.adminId) : null,
        lockedToAdminId: chat.lockedToAdminId ? String(chat.lockedToAdminId) : null,
        requestStatus: req?.status ?? "pending",
        chatStatus: (chat.status as ChatStatus) ?? "in_progress",
        products,
        createdAt: await decryptDateToISOString(chat.createdAt)
      };
    })
  );

  return jsonOk(payload);
}
