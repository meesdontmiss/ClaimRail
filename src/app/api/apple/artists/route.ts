import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface AppleArtistSearchResponse {
  results: Array<{
    artistId: number;
    artistName: string;
    artistLinkUrl?: string;
    primaryGenreName?: string;
  }>;
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

    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=US&media=music&entity=musicArtist&limit=8`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Apple search error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as AppleArtistSearchResponse;

    return NextResponse.json({
      artists: data.results.map((artist) => ({
        id: String(artist.artistId),
        name: artist.artistName,
        image: null,
        url: artist.artistLinkUrl || null,
        subtitle: artist.primaryGenreName || "Apple Music artist",
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to search Apple artists",
      },
      { status: 500 }
    );
  }
}
