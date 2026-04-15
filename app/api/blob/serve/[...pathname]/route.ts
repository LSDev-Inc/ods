import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../../lib/auth/request";

const ALLOWED_PREFIXES = ["products/images/", "products/videos/"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pathname: string[] }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return new NextResponse("Non autorizzato", { status: 401 });
  }

  const { pathname } = await params;
  const path = pathname.join("/");
  if (!ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return new NextResponse("Percorso non valido", { status: 400 });
  }

  const range = request.headers.get("range") ?? undefined;
  let result: Awaited<ReturnType<typeof get>> = null;
  if (range) {
    try {
      result = await get(path, {
        access: "private",
        headers: { Range: range }
      });
    } catch (err) {
      console.warn("Blob range fetch failed, retrying without range:", err);
      result = null;
    }
  }

  if (!result) {
    result = await get(path, { access: "private" });
  }

  const resolveStatus = (value: typeof result) =>
    (value as { statusCode?: number }).statusCode ?? 200;

  if (!result) {
    return new NextResponse("Not found", { status: 404 });
  }

  let status = resolveStatus(result);
  if (!result.stream || (status !== 200 && status !== 206)) {
    if (status === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: new Headers(result.headers)
      });
    }
    return new NextResponse("Not found", { status: 404 });
  }

  const headers = new Headers(result.headers);
  if (result.blob.contentType) {
    headers.set("Content-Type", result.blob.contentType);
  }
  if (result.blob.contentType?.startsWith("video/")) {
    headers.set("Content-Disposition", "inline");
  }
  const contentRange = headers.get("content-range");
  if (range && contentRange) {
    status = 206;
  }
  if (!headers.has("Accept-Ranges")) {
    headers.set("Accept-Ranges", "bytes");
  }
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "private, no-cache");
  if (contentRange) {
    const match = /bytes\s+(\d+)-(\d+)\/(\d+|\*)/i.exec(contentRange);
    if (match) {
      const start = Number(match[1]);
      const end = Number(match[2]);
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
        headers.set("Content-Length", String(end - start + 1));
      }
    }
  } else if (status === 200 && !headers.has("Content-Length") && result.blob.size) {
    headers.set("Content-Length", String(result.blob.size));
  }

  return new NextResponse(result.stream, {
    status,
    headers
  });
}
