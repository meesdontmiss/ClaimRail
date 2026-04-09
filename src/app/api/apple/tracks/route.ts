import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface AppleArtistSearchResult {
  artistId: number;
  artistName: string;
  artistLinkUrl?: string;
  primaryGenreName?: string;
}

interface AppleArtistSearchResponse {
  results: AppleArtistSearchResult[];
}

interface AppleLookupTrack {
  wrapperType?: string;
  kind?: string;
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  releaseDate?: string;
  trackTimeMillis?: number;
}

interface AppleLookupResponse {
  results: AppleLookupTrack[];
}

function formatDuration(ms?: number) {
  if (!ms || Number.isNaN(ms)) {
    return null;
  }

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAppleArtistId(input: string) {
  const trimmed = input.trim();

  try {
    const url = new URL(trimmed);
    const pathnameMatch = url.pathname.match(/\/artist\/[^/]+\/(\d+)/i);
    if (pathnameMatch?.[1]) {
      return pathnameMatch[1];
    }
  } catch {
    // Not a URL, fall through to regex matching.
  }

  const idMatch = trimmed.match(/(?:\/|^)id(\d+)(?:\D|$)/i);
  if (idMatch?.[1]) {
    return idMatch[1];
  }

  return null;
}

async function appleFetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apple API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

async function findArtistId(artistNameOrUrl: string) {
  const artistIdFromUrl = extractAppleArtistId(artistNameOrUrl);
  if (artistIdFromUrl) {
    return artistIdFromUrl;
  }

  const query = artistNameOrUrl.trim();
  const data = await appleFetchJson<AppleArtistSearchResponse>(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=US&media=music&entity=musicArtist&limit=12`
  );

  const wanted = normalizeName(query);
  const exact = data.results.find(
    (artist) => normalizeName(artist.artistName) === wanted
  );

  return String((exact ?? data.results[0])?.artistId ?? "");
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
    const requestedArtistName = searchParams.get("artistName")?.trim() || "";

    if (!requestedArtistName) {
      return NextResponse.json(
        { error: "Artist name or Apple Music artist URL is required to import your releases." },
        { status: 400 }
      );
    }

    const artistId = await findArtistId(requestedArtistName);

    if (!artistId) {
      return NextResponse.json(
        {
          error: `We couldn't confidently match "${requestedArtistName}" to an Apple Music artist page.`,
        },
        { status: 404 }
      );
    }

    const data = await appleFetchJson<AppleLookupResponse>(
      `https://itunes.apple.com/lookup?id=${encodeURIComponent(artistId)}&entity=song&limit=200&country=US`
    );

    const tracks = data.results
      .filter(
        (result) =>
          result.wrapperType === "track" &&
          result.kind === "song" &&
          result.trackName &&
          result.artistName
      )
      .reduce<Array<{
        title: string;
        artist: string;
        album: string;
        isrc: null;
        releaseDate: string | null;
        duration: string | null;
        albumArt: null;
      }>>((allTracks, track) => {
        const dedupeKey = `${track.trackName}::${track.collectionName ?? ""}`.toLowerCase();
        const alreadyIncluded = allTracks.some(
          (existing) =>
            `${existing.title}::${existing.album}`.toLowerCase() === dedupeKey
        );

        if (alreadyIncluded) {
          return allTracks;
        }

        allTracks.push({
          title: track.trackName!,
          artist: track.artistName!,
          album: track.collectionName || "Single",
          isrc: null,
          releaseDate: track.releaseDate?.slice(0, 10) ?? null,
          duration: formatDuration(track.trackTimeMillis),
          albumArt: null,
        });

        return allTracks;
      }, []);

    if (tracks.length === 0) {
      return NextResponse.json(
        {
          error: `Apple Music did not return any tracks for "${requestedArtistName}".`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      tracks,
      total: tracks.length,
      importSource: "artist_catalog",
      artist: {
        id: artistId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch Apple Music tracks",
      },
      { status: 500 }
    );
  }
}
