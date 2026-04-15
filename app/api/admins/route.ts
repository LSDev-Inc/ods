import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "../../../lib/http";
import { dbConnect } from "../../../db/connection";
import { User } from "../../../db/models";
import { getSessionFromRequest } from "../../../lib/auth/request";
import { adminCreateSchema } from "../../../lib/validators";
import { hashSecret } from "../../../lib/crypto/server";
import { decryptDateToISOString, decryptString, encryptDate, encryptString, hashLookup, normalizeUsername } from "../../../lib/crypto/data";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== "owner") return jsonError("Non autorizzato", 401);

  await dbConnect();
  const admins = await User.find({ role: "admin" }).lean();
  return jsonOk(
    await Promise.all(
      admins.map(async (admin) => ({
        id: String(admin._id),
        username: await decryptString(admin.username),
        disabled: admin.disabled,
        createdAt: await decryptDateToISOString(admin.createdAt)
      }))
    )
  );
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== "owner") return jsonError("Non autorizzato", 401);

  const body = await request.json().catch(() => null);
  const parsed = adminCreateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Dati non validi", 400);

  await dbConnect();
  const normalizedUsername = normalizeUsername(parsed.data.username);
  const usernameHash = hashLookup(normalizedUsername, "username");
  const exists = await User.findOne({ usernameHash }).lean();
  if (exists) return jsonError("Username gia in uso", 409);

  const passwordHash = await hashSecret(parsed.data.password);
  const pinOrPassphraseHash = await hashSecret(parsed.data.pinOrPassphrase);

  const admin = await User.create({
    username: await encryptString(normalizedUsername),
    usernameHash,
    passwordHash,
    pinOrPassphraseHash,
    role: "admin",
    publicKey: parsed.data.publicKey,
    privateKeyEncrypted: parsed.data.privateKeyEncrypted,
    privateKeyIv: parsed.data.privateKeyIv,
    kdfSalt: parsed.data.kdfSalt,
    disabled: false,
    createdAt: await encryptDate(new Date())
  });

  return jsonOk({ id: String(admin._id) }, 201);
}
