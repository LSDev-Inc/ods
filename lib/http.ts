import { NextResponse } from "next/server";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive"
};

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: privateHeaders });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: privateHeaders });
}
