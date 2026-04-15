import { NextRequest } from "next/server";
import { cookieNames, verifySessionToken } from "./session";
import { dbConnect } from "../../db/connection";
import { User } from "../../db/models";

export async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(cookieNames.session)?.value;
  if (!token) return null;
  try {
    const payload = await verifySessionToken(token);
    await dbConnect();
    const user = await User.findById(payload.sub).lean();
    if (!user || Array.isArray(user) || user.disabled || user.role !== payload.role) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
