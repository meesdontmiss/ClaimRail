import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const sessionResponse = await fetch(
    `${request.nextUrl.origin}/api/auth/session`,
    {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    }
  );

  const session = await sessionResponse.json();

  return NextResponse.json({
    token: token
      ? {
          spotifyId: token.spotifyId,
          sub: token.sub,
          hasAccessToken: !!token.accessToken,
          hasAuthError: !!token.authError,
        }
      : null,
    session: session,
    cookies: request.headers.get("cookie")?.includes("next-auth") || false,
    nextauthSecret: process.env.NEXTAUTH_SECRET
      ? `set (${process.env.NEXTAUTH_SECRET.length} chars)`
      : "NOT SET",
  });
}
