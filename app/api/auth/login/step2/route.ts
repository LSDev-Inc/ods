import { NextRequest, NextResponse } from "next/server";
import { loginStep2Schema } from "../../../../../lib/validators";
import { jsonError, jsonOk } from "../../../../../lib/http";
import { cookieNames, signSessionToken, verifyStepToken } from "../../../../../lib/auth/session";
import { baseCookieOptions } from "../../../../../lib/auth/cookies";
import { dbConnect } from "../../../../../db/connection";
import { User } from "../../../../../db/models";
import { verifySecret } from "../../../../../lib/crypto/server";
import { decryptString } from "../../../../../lib/crypto/data";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/auth/user/login", request.url));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginStep2Schema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Dati non validi", 400);
    }

    if (!process.env.AUTH_SECRET || !process.env.MONGODB_URI) {
      return jsonError("Server non configurato", 500);
    }

    const stepToken = request.cookies.get(cookieNames.step)?.value;
    if (!stepToken) {
      return jsonError("Sessione di accesso scaduta", 401);
    }

    let stepPayload: Awaited<ReturnType<typeof verifyStepToken>>;
    try {
      stepPayload = await verifyStepToken(stepToken);
    } catch {
      return jsonError("Sessione di accesso scaduta", 401);
    }

    try {
      await dbConnect();
    } catch {
      return jsonError("Database non raggiungibile", 500);
    }
    const user = await User.findById(stepPayload.sub).lean();
    if (!user || Array.isArray(user) || user.disabled) {
      return jsonError("Utente non valido", 401);
    }

    const decryptedUsername = await decryptString(user.username);
    if (!user.pinOrPassphraseHash) {
      return jsonError("PIN o passphrase non valida", 401);
    }

    let ok = false;
    try {
      ok = await verifySecret(user.pinOrPassphraseHash, parsed.data.pinOrPassphrase);
    } catch {
      return jsonError("Errore server", 500);
    }
    if (!ok) {
      return jsonError("PIN o passphrase non valida", 401);
    }

    const sessionToken = await signSessionToken({
      sub: String(user._id),
      role: user.role,
      username: decryptedUsername
    });

    const response = jsonOk({
      userId: String(user._id),
      role: user.role,
      username: decryptedUsername,
      publicKey: user.publicKey,
      privateKeyEncrypted: user.privateKeyEncrypted,
      privateKeyIv: user.privateKeyIv,
      kdfSalt: user.kdfSalt
    });

    response.cookies.set(cookieNames.session, sessionToken, {
      ...baseCookieOptions(),
      maxAge: 60 * 60 * 24 * 7
    });
    response.cookies.delete(cookieNames.step);

    return response;
  } catch {
    return jsonError("Errore server", 500);
  }
}
