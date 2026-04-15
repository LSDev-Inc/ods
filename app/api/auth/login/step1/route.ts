import { NextRequest, NextResponse } from "next/server";
import { loginStep1Schema } from "../../../../../lib/validators";
import { jsonError, jsonOk } from "../../../../../lib/http";
import { dbConnect } from "../../../../../db/connection";
import { User } from "../../../../../db/models";
import { verifySecret } from "../../../../../lib/crypto/server";
import { cookieNames, signStepToken } from "../../../../../lib/auth/session";
import { baseCookieOptions } from "../../../../../lib/auth/cookies";
import { decryptString, hashLookup, normalizeUsername } from "../../../../../lib/crypto/data";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/auth/user/login", request.url));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginStep1Schema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Dati non validi", 400);
    }

    if (!process.env.AUTH_SECRET || !process.env.MONGODB_URI) {
      return jsonError("Server non configurato", 500);
    }

    const { username, password, role } = parsed.data;
    const normalizedUsername = normalizeUsername(username);
    const usernameHash = hashLookup(normalizedUsername, "username");

    try {
      await dbConnect();
    } catch (err) {
      console.error("login step1: db connect error", err);
      return jsonError("Database non raggiungibile", 500);
    }
    const user = await User.findOne({ usernameHash }).lean();

    if (!user || Array.isArray(user) || user.disabled) {
      return jsonError("Credenziali non valide", 401);
    }

    if (role === "user" && user.role !== "user") {
      return jsonError("Accesso non consentito", 403);
    }

    if (role === "admin" && user.role === "user") {
      return jsonError("Accesso non consentito", 403);
    }

    const decryptedUsername = await decryptString(user.username);
    if (!user.passwordHash) {
      console.error("login step1: passwordHash mancante per", decryptedUsername);
      return jsonError("Credenziali non valide", 401);
    }

    let ok = false;
    try {
      ok = await verifySecret(user.passwordHash, password);
    } catch (err) {
      console.error("login step1: verifySecret error", err);
      return jsonError("Errore server", 500);
    }
    if (!ok) {
      return jsonError("Credenziali non valide", 401);
    }

    const token = await signStepToken({
      sub: String(user._id),
      role: user.role,
      username: decryptedUsername
    });

    const response = jsonOk({ ok: true });
    response.cookies.set(cookieNames.step, token, {
      ...baseCookieOptions(),
      maxAge: 60 * 5
    });

    return response;
  } catch (err) {
    console.error("login step1 error", err);
    return jsonError("Errore server", 500);
  }
}
