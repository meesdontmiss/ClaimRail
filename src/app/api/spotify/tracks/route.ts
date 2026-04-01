import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    release_date: string;
    images: { url: string }[];
  };
  external_ids?: { isrc?: string };
  duration_ms: number;
}

interface SpotifyResponse {
  items: { track: SpotifyTrack }[];
  next: string | null;
  total: number;
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      console.error('No Spotify access token in session');
      return NextResponse.json(
        { error: "Not authenticated with Spotify", hasSession: !!session, hasToken: !!session?.accessToken },
        { status: 401 }
      );
    }

    const accessToken = session.accessToken as string;

    try {
      const allTracks: SpotifyTrack[] = [];
      let url: string | null = "https://api.spotify.com/v1/me/tracks?limit=50";

      while (url) {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          const err = await res.text();
          console.error('Spotify API error:', res.status, err);
          return NextResponse.json(
            { error: "Spotify API error", details: err, status: res.status },
            { status: res.status }
          );
        }

        const data: SpotifyResponse = await res.json();
        allTracks.push(...data.items.map((i) => i.track));
        url = data.next;

        // Cap at 200 tracks for MVP
        if (allTracks.length >= 200) break;
      }

      const tracks = allTracks.map((t) => ({
        spotifyId: t.id,
        title: t.name,
        artist: t.artists.map((a) => a.name).join(", "),
        album: t.album.name,
        isrc: t.external_ids?.isrc || null,
        releaseDate: t.album.release_date || null,
        duration: formatDuration(t.duration_ms),
        albumArt: t.album.images?.[0]?.url || null,
      }));

      return NextResponse.json({ tracks, total: tracks.length });
    } catch (error) {
      console.error('Spotify fetch error:', error);
      return NextResponse.json(
        { error: "Failed to fetch Spotify tracks", details: error instanceof Error ? error.message : error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
}
