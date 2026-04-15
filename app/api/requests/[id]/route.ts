import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "../../../../lib/http";
import { dbConnect } from "../../../../db/connection";
import { Chat, Message, Request } from "../../../../db/models";
import { getSessionFromRequest } from "../../../../lib/auth/request";
import { encryptDate } from "../../../../lib/crypto/data";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSessionFromRequest(request);
  if (!session || (session.role !== "admin" && session.role !== "owner")) {
    return jsonError("Non autorizzato", 401);
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (action !== "accept" && action !== "reject") {
    return jsonError("Azione non valida", 400);
  }

  await dbConnect();
  const reqDoc = await Request.findById(id);
  if (!reqDoc) {
    return jsonError("Richiesta non trovata", 404);
  }

  if (reqDoc.status !== "pending") {
    return jsonError("Richiesta gia gestita", 409);
  }

  if (action === "reject") {
    reqDoc.status = "rejected";
    reqDoc.assignedAdminId = null;
    await reqDoc.save();
    const chatToDelete = await Chat.findOne({ requestId: reqDoc._id }).select("_id").lean();
    if (chatToDelete && !Array.isArray(chatToDelete)) {
      await Message.deleteMany({ chatId: chatToDelete._id });
      await Chat.deleteOne({ _id: chatToDelete._id });
    }
    return jsonOk({ ok: true });
  }

  reqDoc.status = "accepted";
  reqDoc.assignedAdminId = session.sub;
  await reqDoc.save();

  const existingChat = await Chat.findOne({ requestId: reqDoc._id });
  if (!existingChat) {
    await Chat.create({
      requestId: reqDoc._id,
      userId: reqDoc.userId,
      adminId: session.sub,
      lockedToAdminId: session.sub,
      createdAt: await encryptDate(new Date())
    });
  } else {
    existingChat.adminId = session.sub as any;
    existingChat.lockedToAdminId = session.sub as any;
    await existingChat.save();
  }

  return jsonOk({ ok: true });
}
