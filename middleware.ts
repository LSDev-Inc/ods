import { NextRequest, NextResponse } from "next/server";
import { cookieNames, verifyAccessToken, verifySessionToken } from "./lib/auth/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get(cookieNames.access)?.value;
  const sessionToken = request.cookies.get(cookieNames.session)?.value;

  const isAccessRoute = pathname.startsWith("/access") || pathname.startsWith("/auth");
  const isUserRoute = pathname.startsWith("/user");
  const isAdminRoute = pathname.startsWith("/admin");
  const isOwnerRoute = pathname.startsWith("/owner");

  if (isAccessRoute) {
    if (!accessToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    try {
      const ok = await verifyAccessToken(accessToken);
      if (!ok) throw new Error("invalid");
    } catch {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  if (isUserRoute || isAdminRoute || isOwnerRoute) {
    if (!sessionToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/access";
      return NextResponse.redirect(url);
    }

    try {
      const session = await verifySessionToken(sessionToken);
      if (isOwnerRoute && session.role !== "owner") {
        return NextResponse.redirect(new URL("/access", request.url));
      }
      if (isAdminRoute && session.role === "user") {
        return NextResponse.redirect(new URL("/access", request.url));
      }
      if (isUserRoute && session.role !== "user") {
        return NextResponse.redirect(new URL("/access", request.url));
      }
    } catch {
      const url = request.nextUrl.clone();
      url.pathname = "/access";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/access", "/auth/:path*", "/user/:path*", "/admin/:path*", "/owner/:path*"]
};
