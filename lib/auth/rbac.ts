import { cookies } from "next/headers";
import { cookieNames, Role, verifySessionToken } from "./session";
import { dbConnect } from "../../db/connection";
import { User } from "../../db/models";

export type Session = {
  sub: string;
  role: Role;
  username: string;
};

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieNames.session)?.value;
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

export function hasRole(role: Role, allowed: Role[]) {
  if (role === "owner") return true;
  if (role === "admin" && allowed.includes("admin")) return true;
  return allowed.includes(role);
}

export function assertRole(session: Session | null, allowed: Role[]) {
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  if (!hasRole(session.role, allowed)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
