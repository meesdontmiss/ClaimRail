import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface SpotifyArtist {
  id: string;
  name: string;
  popularity?: number;
}

interface SpotifyClientCredentialsResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyAlbumSummary {
  id: string;
  name: string;
  release_date: string;
}

interface SpotifyAlbumTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
}

interface SpotifyAlbumDetails {
  id: string;
  name: string;
  release_date: string;
  images: { url: string }[];
  tracks: {
    items: SpotifyAlbumTrack[];
  };
}

interface SpotifyTrackDetails {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: {
    name: string;
    release_date: string;
    images: { url: string }[];
  };
  external_ids?: { isrc?: string };
  duration_ms: number;
}

interface SpotifyArtistSearchResponse {
  artists: {
    items: SpotifyArtist[];
  };
}

interface SpotifyArtistAlbumsResponse {
  items: SpotifyAlbumSummary[];
  next: string | null;
}

interface SpotifyTracksBatchResponse {
  tracks: SpotifyTrackDetails[];
}

let spotifyAppTokenCache:
  | {
      accessToken: string;
      expiresAt: number;
    }
  | null = null;

function formatDuration(ms: number): string {
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

async function spotifyFetch<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify API error ${res.status}: ${err}`);
  }

  return res.json() as Promise<T>;
}

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

  const tokenData: SpotifyClientCredentialsResponse | { error?: string; error_description?: string } =
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

function extractArtistId(input: string) {
  const trimmed = input.trim();
  const webMatch = trimmed.match(/spotify\.com\/artist\/([A-Za-z0-9]+)/i);
  if (webMatch?.[1]) {
    return webMatch[1];
  }

  const uriMatch = trimmed.match(/^spotify:artist:([A-Za-z0-9]+)$/i);
  if (uriMatch?.[1]) {
    return uriMatch[1];
  }

  return null;
}

async function getArtistById(accessToken: string, artistId: string) {
  return spotifyFetch<SpotifyArtist>(
    `https://api.spotify.com/v1/artists/${artistId}`,
    accessToken
  );
}

async function findArtist(accessToken: string, artistName: string) {
  const artistId = extractArtistId(artistName);
  if (artistId) {
    return getArtistById(accessToken, artistId);
  }

  const query = encodeURIComponent(artistName);
  const data: SpotifyArtistSearchResponse = await spotifyFetch(
    `https://api.spotify.com/v1/search?type=artist&limit=20&q=${query}`,
    accessToken
  );

  const wanted = normalizeName(artistName);
  const exactMatches = data.artists.items
    .filter((artist) => normalizeName(artist.name) === wanted)
    .sort((left, right) => (right.popularity ?? 0) - (left.popularity ?? 0));

  return exactMatches[0] ?? null;
}

async function fetchAllArtistAlbums(accessToken: string, artistId: string) {
  const albums: SpotifyAlbumSummary[] = [];
  let url: string | null =
    `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation&limit=50`;

  while (url) {
    const page: SpotifyArtistAlbumsResponse = await spotifyFetch(url, accessToken);
    albums.push(...page.items);
    url = page.next;
  }

  const uniqueAlbums = new Map<string, SpotifyAlbumSummary>();
  for (const album of albums) {
    if (!uniqueAlbums.has(album.id)) {
      uniqueAlbums.set(album.id, album);
    }
  }

  return [...uniqueAlbums.values()];
}

async function fetchAlbumDetails(accessToken: string, albumIds: string[]) {
  const details: SpotifyAlbumDetails[] = [];

  for (const albumId of albumIds) {
    const album: SpotifyAlbumDetails = await spotifyFetch(
      `https://api.spotify.com/v1/albums/${albumId}`,
      accessToken
    );
    details.push(album);
  }

  return details;
}

async function fetchTrackDetails(accessToken: string, trackIds: string[]) {
  const tracks: SpotifyTrackDetails[] = [];

  for (let index = 0; index < trackIds.length; index += 50) {
    const batch = trackIds.slice(index, index + 50);
    const data: SpotifyTracksBatchResponse = await spotifyFetch(
      `https://api.spotify.com/v1/tracks?ids=${batch.join(",")}`,
      accessToken
    );
    tracks.push(...data.tracks.filter(Boolean));
  }

  return tracks;
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

    const accessToken = await getSpotifyAppAccessToken();
    const { searchParams } = new URL(request.url);
    const requestedArtistName =
      searchParams.get("artistName")?.trim() || "";

    if (!requestedArtistName) {
      return NextResponse.json(
        { error: "Artist name or Spotify artist URL is required to import your releases." },
        { status: 400 }
      );
    }

    const artist = await findArtist(accessToken, requestedArtistName);
    if (!artist) {
      return NextResponse.json(
        {
          error: `We couldn't confidently match "${requestedArtistName}" to a Spotify artist page. Paste the exact Spotify artist URL or URI to import the right catalog.`,
        },
        { status: 404 }
      );
    }

    const albums = await fetchAllArtistAlbums(accessToken, artist.id);
    const albumDetails = await fetchAlbumDetails(
      accessToken,
      albums.map((album) => album.id)
    );

    const artistNameNormalized = normalizeName(artist.name);
    const relevantTrackIds = new Set<string>();

    for (const album of albumDetails) {
      for (const track of album.tracks.items) {
        const isArtistTrack = track.artists.some(
          (trackArtist) =>
            trackArtist.id === artist.id ||
            normalizeName(trackArtist.name) === artistNameNormalized
        );

        if (isArtistTrack) {
          relevantTrackIds.add(track.id);
        }
      }
    }

    const trackDetails = await fetchTrackDetails(accessToken, [...relevantTrackIds]);
    const dedupedTracks = new Map<string, SpotifyTrackDetails>();

    for (const track of trackDetails) {
      const dedupeKey = track.external_ids?.isrc || track.id;
      if (!dedupedTracks.has(dedupeKey)) {
        dedupedTracks.set(dedupeKey, track);
      }
    }

    const tracks = [...dedupedTracks.values()].map((track) => ({
      spotifyId: track.id,
      title: track.name,
      artist: track.artists.map((artistItem) => artistItem.name).join(", "),
      album: track.album.name,
      isrc: track.external_ids?.isrc || null,
      releaseDate: track.album.release_date || null,
      duration: formatDuration(track.duration_ms),
      albumArt: track.album.images?.[0]?.url || null,
    }));

    return NextResponse.json({
      tracks,
      total: tracks.length,
      importSource: "artist_catalog",
      artist: {
        id: artist.id,
        name: artist.name,
      },
    });
  } catch (error) {
    console.error("Spotify catalog import error:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Session expired. Please sign in again." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Spotify tracks",
      },
      { status: 500 }
    );
  }
}
