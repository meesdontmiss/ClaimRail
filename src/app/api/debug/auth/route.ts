import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const sessionRes = await fetch(
    `${request.nextUrl.origin}/api/auth/session`,
    { headers: { cookie: request.headers.get("cookie") || "" } }
  );
  const session = await sessionRes.json();

  return NextResponse.json({
    token: token ? {
      googleId: token.googleId,
      sub: token.sub,
      email: token.email,
    } : null,
    session,
    hasCookies: request.headers.get("cookie")?.includes("next-auth") || false,
    env: {
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nextAuthUrl: process.env.NEXTAUTH_URL || "missing",
    },
  });
}
