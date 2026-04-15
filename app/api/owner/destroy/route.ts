import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { jsonError, jsonOk } from "../../../../lib/http";
import { dbConnect } from "../../../../db/connection";
import { User } from "../../../../db/models";
import { getSessionFromRequest } from "../../../../lib/auth/request";
import { loginStep2Schema } from "../../../../lib/validators";
import { verifySecret } from "../../../../lib/crypto/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== "owner") {
    return jsonError("Non autorizzato", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = loginStep2Schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Dati non validi", 400);
  }

  if (!process.env.MONGODB_URI) {
    return jsonError("Server non configurato", 500);
  }

  await dbConnect();
  const user = await User.findById(session.sub).lean();
  if (!user || Array.isArray(user)) {
    return jsonError("Utente non valido", 401);
  }

  let ok = false;
  try {
    ok = await verifySecret(user.pinOrPassphraseHash, parsed.data.pinOrPassphrase);
  } catch {
    ok = false;
  }
  if (!ok) {
    return jsonError("Passphrase non valida", 401);
  }

  const db = mongoose.connection.db;
  if (!db) {
    return jsonError("Database non disponibile", 500);
  }

  try {
    await db.dropDatabase();
  } catch (err) {
    console.error("destroy db error", err);
    return jsonError("Errore server", 500);
  }

  return jsonOk({ ok: true });
}
