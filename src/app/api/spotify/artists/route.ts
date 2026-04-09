import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface SpotifyClientCredentialsResponse {
  access_token: string;
  expires_in: number;
}

interface SpotifyArtistSearchResponse {
  artists: {
    items: Array<{
      id: string;
      name: string;
      popularity?: number;
      images?: Array<{ url: string }>;
      external_urls?: { spotify?: string };
    }>;
  };
}

let spotifyAppTokenCache:
  | {
      accessToken: string;
      expiresAt: number;
    }
  | null = null;

async function getSpotifyAppAccessToken() {
  if (spotifyAppTokenCache && Date.now() < spotifyAppTokenCache.expiresAt - 60_000) {
    return spotifyAppTokenCache.accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Spotify client credentials are not configured.");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });

  const tokenData: SpotifyClientCredentialsResponse | { error_description?: string } =
    await response.json();

  if (!response.ok || !("access_token" in tokenData) || !tokenData.access_token) {
    throw new Error(
      "error_description" in tokenData && tokenData.error_description
        ? tokenData.error_description
        : "Failed to get Spotify app access token."
    );
  }

  spotifyAppTokenCache = {
    accessToken: tokenData.access_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  };

  return spotifyAppTokenCache.accessToken;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Session expired. Please sign in again." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() || "";

    if (query.length < 2) {
      return NextResponse.json({ artists: [] });
    }

    const accessToken = await getSpotifyAppAccessToken();
    const response = await fetch(
      `https://api.spotify.com/v1/search?type=artist&limit=8&q=${encodeURIComponent(query)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Spotify API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as SpotifyArtistSearchResponse;

    return NextResponse.json({
      artists: data.artists.items.map((artist) => ({
        id: artist.id,
        name: artist.name,
        image: artist.images?.[0]?.url || null,
        url: artist.external_urls?.spotify || null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to search Spotify artists",
      },
      { status: 500 }
    );
  }
}
