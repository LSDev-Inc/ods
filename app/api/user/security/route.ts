import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "../../../../lib/http";
import { dbConnect } from "../../../../db/connection";
import { User } from "../../../../db/models";
import { getSessionFromRequest } from "../../../../lib/auth/request";
import { hashSecret } from "../../../../lib/crypto/server";

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return jsonError("Non autorizzato", 401);

  const body = await request.json().catch(() => null);
  const password = body?.password as string | undefined;
  const pinOrPassphrase = body?.pinOrPassphrase as string | undefined;

  if (!password && !pinOrPassphrase) {
    return jsonError("Nessun dato da aggiornare", 400);
  }

  await dbConnect();
  const user = await User.findById(session.sub);
  if (!user) return jsonError("Utente non trovato", 404);

  if (password) {
    user.passwordHash = await hashSecret(password);
  }
  if (pinOrPassphrase) {
    user.pinOrPassphraseHash = await hashSecret(pinOrPassphrase);
  }

  await user.save();
  return jsonOk({ ok: true });
}

