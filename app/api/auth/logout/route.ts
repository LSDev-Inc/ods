import { NextResponse } from "next/server";
import { cookieNames } from "../../../../lib/auth/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(cookieNames.session);
  response.cookies.delete(cookieNames.step);
  response.cookies.delete(cookieNames.access);
  return response;
}
