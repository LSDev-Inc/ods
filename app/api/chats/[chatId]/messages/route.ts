import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "../../../../../lib/http";
import { dbConnect } from "../../../../../db/connection";
import { Chat, Message, Request } from "../../../../../db/models";
import { getSessionFromRequest } from "../../../../../lib/auth/request";
import { messageSchema } from "../../../../../lib/validators";
import type { ChatStatus } from "../../../../../db/models/Chat";
import { decryptDate, encryptDate } from "../../../../../lib/crypto/data";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) return jsonError("Non autorizzato", 401);

  await dbConnect();
  const chat = await Chat.findById(chatId).lean();
  if (!chat || Array.isArray(chat)) return jsonError("Chat non trovata", 404);

  if (isExpired(chat.status as ChatStatus, chat.completedAt || undefined, chat.expiresAt || undefined)) {
    await Message.deleteMany({ chatId: chat._id });
    await Chat.deleteOne({ _id: chat._id });
    return jsonError("Chat non trovata", 404);
  }

  if (session.role === "user" && chat.userId.toString() !== session.sub) {
    return jsonError("Non autorizzato", 403);
  }
  if (session.role === "admin" && chat.lockedToAdminId?.toString() !== session.sub) {
    return jsonError("Non autorizzato", 403);
  }

  const messages = await Message.find({ chatId: chat._id }).lean();
  const enriched = await Promise.all(
    messages.map(async (message) => {
      const createdAtDate = await decryptDate(message.createdAt);
      return {
        message,
        createdAtDate
      };
    })
  );
  enriched.sort((a, b) => {
    const aTime = a.createdAtDate ? a.createdAtDate.getTime() : 0;
    const bTime = b.createdAtDate ? b.createdAtDate.getTime() : 0;
    return aTime - bTime;
  });
  return jsonOk(
    enriched.map(({ message, createdAtDate }) => ({
        id: String(message._id),
        senderId: String(message.senderId),
        receiverId: String(message.receiverId),
        ciphertext: message.ciphertext,
        iv: message.iv,
        encryptedSymKey: message.encryptedSymKey,
        createdAt: createdAtDate ? createdAtDate.toISOString() : ""
      }))
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) return jsonError("Non autorizzato", 401);

  const body = await request.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return jsonError("Dati non validi", 400);

  await dbConnect();
  const chat = await Chat.findById(chatId);
  if (!chat) return jsonError("Chat non trovata", 404);

  if (isExpired(chat.status as ChatStatus, chat.completedAt || undefined, chat.expiresAt || undefined)) {
    await Message.deleteMany({ chatId: chat._id });
    await Chat.deleteOne({ _id: chat._id });
    return jsonError("Chat non trovata", 404);
  }

  const requestDoc = await Request.findById(chat.requestId).lean();
  if (!requestDoc || Array.isArray(requestDoc)) return jsonError("Richiesta non trovata", 404);

  if (requestDoc.status !== "accepted") {
    return jsonError("Chat non disponibile", 409);
  }

  if (chat.status === "completed") {
    return jsonError("Chat conclusa", 409);
  }

  if (session.role === "user") {
    if (chat.userId.toString() !== session.sub) {
      return jsonError("Non autorizzato", 403);
    }
    if (chat.lockedToAdminId?.toString() !== parsed.data.receiverId) {
      return jsonError("Destinatario non valido", 400);
    }
  }

  if (session.role === "admin") {
    if (chat.lockedToAdminId?.toString() !== session.sub) {
      return jsonError("Non autorizzato", 403);
    }
    if (chat.userId.toString() !== parsed.data.receiverId) {
      return jsonError("Destinatario non valido", 400);
    }
  }

  if (session.role === "owner") {
    if (chat.userId.toString() !== parsed.data.receiverId) {
      return jsonError("Destinatario non valido", 400);
    }
  }

  const message = await Message.create({
    chatId: chat._id,
    senderId: session.sub,
    receiverId: parsed.data.receiverId,
    ciphertext: parsed.data.ciphertext,
    iv: parsed.data.iv,
    encryptedSymKey: parsed.data.encryptedSymKey,
    createdAt: await encryptDate(new Date())
  });

  return jsonOk({ id: String(message._id) }, 201);
}
