import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "../../../../lib/http";
import { cookieNames } from "../../../../lib/auth/session";
import { getSessionFromRequest } from "../../../../lib/auth/request";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    const response = jsonOk({ ok: false });
    response.cookies.delete(cookieNames.session);
    response.cookies.delete(cookieNames.step);
    response.cookies.delete(cookieNames.access);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const response = jsonOk({ ok: true, role: session.role });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
