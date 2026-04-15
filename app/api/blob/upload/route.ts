import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionFromRequest } from "../../../../lib/auth/request";

const MAX_IMAGE_BYTES = 1_000_000;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const IMAGE_PREFIX = "products/images/";
const VIDEO_PREFIX = "products/videos/";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionFromRequest(request);
  if (!session || (session.role !== "admin" && session.role !== "owner")) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN mancante" }, { status: 500 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (pathname.startsWith(IMAGE_PREFIX)) {
          return {
            allowedContentTypes: ["image/*"],
            maximumSizeInBytes: MAX_IMAGE_BYTES,
            addRandomSuffix: true
          };
        }
        if (pathname.startsWith(VIDEO_PREFIX)) {
          return {
            allowedContentTypes: ["video/*"],
            maximumSizeInBytes: MAX_VIDEO_BYTES,
            addRandomSuffix: true
          };
        }
        throw new Error("Percorso non valido");
      }
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
