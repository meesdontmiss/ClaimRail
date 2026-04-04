import { NextResponse } from "next/server";

function requireEnv(name: "SPOTIFY_CLIENT_ID" | "NEXTAUTH_URL") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export async function GET() {
  try {
    const clientId = requireEnv("SPOTIFY_CLIENT_ID");
    const baseUrl = requireEnv("NEXTAUTH_URL");
    const redirectUri = `${baseUrl}/api/debug/spotify-oauth/callback`;
    const state = crypto.randomUUID();

    const url = new URL("https://accounts.spotify.com/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "user-read-email user-read-private");
    url.searchParams.set("state", state);
    url.searchParams.set("show_dialog", "true");

    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        stage: "authorize",
        error: error instanceof Error ? error.message : "Failed to start Spotify debug OAuth flow",
      },
      { status: 500 }
    );
  }
}
