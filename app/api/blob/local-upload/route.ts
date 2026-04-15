import { put } from "@vercel/blob";
import { NextRequest } from "next/server";
import { getSessionFromRequest } from "../../../../lib/auth/request";
import { jsonError, jsonOk } from "../../../../lib/http";

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const VIDEO_PREFIX = "products/videos/";

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || (session.role !== "admin" && session.role !== "owner")) {
    return jsonError("Non autorizzato", 401);
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return jsonError("BLOB_READ_WRITE_TOKEN mancante", 500);
  }

  const form = await request.formData();
  const file = form.get("file");
  const pathname = form.get("pathname");

  if (!(file instanceof File)) {
    return jsonError("File mancante", 400);
  }
  if (typeof pathname !== "string" || !pathname.startsWith(VIDEO_PREFIX)) {
    return jsonError("Percorso non valido", 400);
  }
  if (!file.type.startsWith("video/")) {
    return jsonError("Formato video non valido.", 400);
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return jsonError("Video troppo grande. Max 200 MB.", 400);
  }

  try {
    const blob = await put(pathname, file, {
      access: "private"
    });
    return jsonOk({ pathname: blob.pathname });
  } catch (error: any) {
    const message = String(error?.message ?? "");
    if (message.includes("Cannot use private access on a public store")) {
      return jsonError(
        "Blob store pubblico. Imposta l'accesso privato nel dashboard Vercel e rigenera il token.",
        400
      );
    }
    return jsonError(message || "Upload video non riuscito.", 500);
  }
}
