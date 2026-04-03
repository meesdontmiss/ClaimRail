import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface SpotifyArtist {
  id: string;
  name: string;
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

async function findArtist(accessToken: string, artistName: string) {
  const query = encodeURIComponent(artistName);
  const data: SpotifyArtistSearchResponse = await spotifyFetch(
    `https://api.spotify.com/v1/search?type=artist&limit=10&q=${query}`,
    accessToken
  );

  const wanted = normalizeName(artistName);
  const exactMatch =
    data.artists.items.find((artist) => normalizeName(artist.name) === wanted) ?? null;

  if (exactMatch) {
    return exactMatch;
  }

  return data.artists.items.find((artist) => normalizeName(artist.name).includes(wanted)) ?? null;
}

async function fetchAllArtistAlbums(accessToken: string, artistId: string) {
  const albums: SpotifyAlbumSummary[] = [];
  let url: string | null =
    `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=50`;

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

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Not authenticated with Spotify" },
        { status: 401 }
      );
    }

    const accessToken = session.accessToken as string;
    const { searchParams } = new URL(request.url);
    const requestedArtistName =
      searchParams.get("artistName")?.trim() || session.user?.name?.trim() || "";

    if (!requestedArtistName) {
      return NextResponse.json(
        { error: "Artist name is required to import your Spotify releases." },
        { status: 400 }
      );
    }

    const artist = await findArtist(accessToken, requestedArtistName);
    if (!artist) {
      return NextResponse.json(
        {
          error: `We couldn't find a Spotify artist profile for "${requestedArtistName}". Try your exact stage name.`,
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
