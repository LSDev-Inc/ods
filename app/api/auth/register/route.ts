import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "../../../../lib/validators";
import { jsonError, jsonOk } from "../../../../lib/http";
import { dbConnect } from "../../../../db/connection";
import { User } from "../../../../db/models";
import { hashSecret } from "../../../../lib/crypto/server";
import { encryptDate, encryptString, hashLookup, normalizeUsername } from "../../../../lib/crypto/data";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/auth/user/register", request.url));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Dati non validi", 400);
    }

    if (!process.env.MONGODB_URI) {
      return jsonError("Server non configurato", 500);
    }

    const { username, password, pinOrPassphrase, publicKey, privateKeyEncrypted, privateKeyIv, kdfSalt } =
      parsed.data;

    try {
      await dbConnect();
    } catch {
      return jsonError("Database non raggiungibile", 500);
    }

    const normalizedUsername = normalizeUsername(username);
    const usernameHash = hashLookup(normalizedUsername, "username");
    const existing = await User.findOne({ usernameHash }).lean();
    if (existing) {
      return jsonError("Username gia in uso", 409);
    }

    const passwordHash = await hashSecret(password);
    const pinOrPassphraseHash = await hashSecret(pinOrPassphrase);

    await User.create({
      username: await encryptString(normalizedUsername),
      usernameHash,
      passwordHash,
      pinOrPassphraseHash,
      role: "user",
      publicKey,
      privateKeyEncrypted,
      privateKeyIv,
      kdfSalt,
      disabled: false,
      createdAt: await encryptDate(new Date())
    });

    return jsonOk({ ok: true }, 201);
  } catch {
    return jsonError("Errore server", 500);
  }
}
