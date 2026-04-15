import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "../../../../lib/http";
import { dbConnect } from "../../../../db/connection";
import { User } from "../../../../db/models";
import { getSessionFromRequest } from "../../../../lib/auth/request";
import { adminUpdateSchema } from "../../../../lib/validators";
import { hashSecret } from "../../../../lib/crypto/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ adminId: string }> }
) {
  const { adminId } = await params;
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== "owner") return jsonError("Non autorizzato", 401);

  const body = await request.json().catch(() => null);
  const parsed = adminUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Dati non validi", 400);

  await dbConnect();
  const admin = await User.findById(adminId);
  if (!admin || admin.role !== "admin") return jsonError("Admin non trovato", 404);

  if (parsed.data.password) {
    admin.passwordHash = await hashSecret(parsed.data.password);
  }
  if (parsed.data.pinOrPassphrase) {
    admin.pinOrPassphraseHash = await hashSecret(parsed.data.pinOrPassphrase);
  }
  if (parsed.data.publicKey) {
    admin.publicKey = parsed.data.publicKey;
  }
  if (parsed.data.privateKeyEncrypted) {
    admin.privateKeyEncrypted = parsed.data.privateKeyEncrypted;
  }
  if (parsed.data.privateKeyIv) {
    admin.privateKeyIv = parsed.data.privateKeyIv;
  }
  if (parsed.data.kdfSalt) {
    admin.kdfSalt = parsed.data.kdfSalt;
  }
  if (typeof parsed.data.disabled === "boolean") {
    admin.disabled = parsed.data.disabled;
  }

  await admin.save();
  return jsonOk({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ adminId: string }> }
) {
  const { adminId } = await params;
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== "owner") return jsonError("Non autorizzato", 401);

  await dbConnect();
  const admin = await User.findById(adminId);
  if (!admin || admin.role !== "admin") return jsonError("Admin non trovato", 404);

  await admin.deleteOne();
  return jsonOk({ ok: true });
}
