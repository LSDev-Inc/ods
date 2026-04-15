import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "../../../../../lib/http";
import { dbConnect } from "../../../../../db/connection";
import { Chat, User } from "../../../../../db/models";
import { getSessionFromRequest } from "../../../../../lib/auth/request";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) return jsonError("Non autorizzato", 401);

  await dbConnect();

  if (session.role === "user") {
    const chat = await Chat.findOne({ userId: session.sub, lockedToAdminId: userId }).lean();
    if (!chat) return jsonError("Non autorizzato", 403);
  }

  if (session.role === "admin") {
    const chat = await Chat.findOne({ userId, lockedToAdminId: session.sub }).lean();
    if (!chat) return jsonError("Non autorizzato", 403);
  }

  const user = await User.findById(userId).lean();
  if (!user || Array.isArray(user)) return jsonError("Utente non trovato", 404);

  return jsonOk({ publicKey: user.publicKey, userId: String(user._id), role: user.role });
}
