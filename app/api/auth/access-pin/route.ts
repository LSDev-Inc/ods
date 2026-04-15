import { NextRequest } from "next/server";
import { accessPinSchema } from "../../../../lib/validators";
import { jsonError, jsonOk } from "../../../../lib/http";
import { env } from "../../../../lib/env";
import { hashSecret, safeCompare, verifySecret } from "../../../../lib/crypto/server";
import { cookieNames, signAccessToken } from "../../../../lib/auth/session";
import { baseCookieOptions } from "../../../../lib/auth/cookies";
import { dbConnect } from "../../../../db/connection";
import { Setting } from "../../../../db/models";

async function readAccessPinHashFromDb() {
  try {
    await dbConnect();
    const doc = await Setting.findOne({ key: "accessPinHash" }).lean();
    if (!doc || Array.isArray(doc)) return null;
    return doc.value ?? null;
  } catch {
    return null;
  }
}

async function seedAccessPinHash(rawPin: string) {
  try {
    const hash = await hashSecret(rawPin);
    await dbConnect();
    await Setting.findOneAndUpdate(
      { key: "accessPinHash" },
      { value: hash, updatedAt: new Date() },
      { upsert: true }
    );
    return hash;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = accessPinSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("PIN non valido", 400);
  }

  const pin = parsed.data.pin.trim();
  if (pin.length < 4) {
    return jsonError("PIN non valido", 400);
  }
  const rawPin = env.accessPin();
  const dbHash = await readAccessPinHashFromDb();
  const seededHash = !dbHash && rawPin ? await seedAccessPinHash(rawPin) : null;
  const hash = dbHash ?? seededHash ?? env.accessPinHash();

  let ok = false;
  if (rawPin) {
    ok = safeCompare(rawPin, pin);
  }
  if (!ok) {
    if (hash) {
      try {
        ok = await verifySecret(hash, pin);
      } catch {
        ok = false;
      }
    }
  }

  if (!ok) {
    return jsonError("PIN non valido", 401);
  }

  if (!process.env.AUTH_SECRET) {
    return jsonError("Server non configurato", 500);
  }

  const token = await signAccessToken();
  const response = jsonOk({ ok: true });
  response.cookies.set(cookieNames.access, token, {
    ...baseCookieOptions(),
    maxAge: 60 * 15,
    path: "/"
  });
  return response;
}
