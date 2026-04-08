import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const RETIRED_PAGES = ["/audit", "/fix", "/claims", "/register", "/recover"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (RETIRED_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  if (!isDashboard) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const signInUrl = new URL("/connect", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/audit/:path*",
    "/fix/:path*",
    "/claims/:path*",
    "/register/:path*",
    "/recover/:path*",
  ],
};
