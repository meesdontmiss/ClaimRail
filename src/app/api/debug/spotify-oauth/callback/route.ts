import { NextRequest, NextResponse } from "next/server";

function requireEnv(
  name: "SPOTIFY_CLIENT_ID" | "SPOTIFY_CLIENT_SECRET" | "NEXTAUTH_URL"
) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

type SpotifyTokenSuccess = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

export async function GET(request: NextRequest) {
  try {
    const clientId = requireEnv("SPOTIFY_CLIENT_ID");
    const clientSecret = requireEnv("SPOTIFY_CLIENT_SECRET");
    const baseUrl = requireEnv("NEXTAUTH_URL");
    const redirectUri = `${baseUrl}/api/debug/spotify-oauth/callback`;
    const { searchParams } = new URL(request.url);

    const error = searchParams.get("error");
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          stage: "spotify_authorize",
          error,
          redirectUri,
          state,
        },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        {
          ok: false,
          stage: "callback",
          error: "Missing code",
          redirectUri,
          state,
        },
        { status: 400 }
      );
    }

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
    });

    const tokenText = await tokenResponse.text();
    const tokenBody = safeJsonParse(tokenText) as SpotifyTokenSuccess | string;

    if (!tokenResponse.ok || typeof tokenBody === "string" || !tokenBody.access_token) {
      return NextResponse.json(
        {
          ok: false,
          stage: "token_exchange",
          redirectUri,
          state,
          spotifyStatus: tokenResponse.status,
          spotifyStatusText: tokenResponse.statusText,
          spotifyBody: tokenBody,
        },
        { status: 400 }
      );
    }

    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${tokenBody.access_token}`,
      },
      cache: "no-store",
    });

    const profileText = await profileResponse.text();
    const profileBody = safeJsonParse(profileText);

    return NextResponse.json({
      ok: profileResponse.ok,
      stage: profileResponse.ok ? "profile_fetch" : "profile_fetch_failed",
      redirectUri,
      state,
      tokenExchange: {
        status: tokenResponse.status,
        tokenType: tokenBody.token_type,
        expiresIn: tokenBody.expires_in,
        scope: tokenBody.scope,
        hasRefreshToken: Boolean(tokenBody.refresh_token),
        hasAccessToken: Boolean(tokenBody.access_token),
      },
      profileFetch: {
        status: profileResponse.status,
        statusText: profileResponse.statusText,
        body: profileBody,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        stage: "unexpected_exception",
        error: error instanceof Error ? error.message : "Unexpected Spotify OAuth debug failure",
      },
      { status: 500 }
    );
  }
}
