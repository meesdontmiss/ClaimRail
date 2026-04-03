"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Papa from "papaparse";
import { v4 as uuidv4 } from "uuid";
import { useAppStore } from "@/lib/store";
import { startSpotifySignIn } from "@/lib/spotify-signin";
import { AppShell } from "@/components/app-shell";
import { LaunchGuideCard } from "@/components/setup/launch-guide-card";
import { Recording, CatalogIssue } from "@/lib/types";
import { scoreRecording } from "@/lib/mock-data";
import { spotifyTracksToRecordings, SpotifyTrackData } from "@/lib/spotify";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  Music,
  Zap,
  Shield,
  DollarSign,
} from "lucide-react";

function detectIssues(rec: Partial<Recording>): CatalogIssue[] {
  const issues: CatalogIssue[] = [];

  if (!rec.isrc) {
    issues.push({
      id: uuidv4(),
      recordingId: rec.id || "",
      type: "missing_isrc",
      severity: "high",
      title: "Missing ISRC code",
      description:
        "This recording has no ISRC. Without it, royalty systems can't match payments to this song.",
      actionLabel: "Add ISRC",
      resolved: false,
    });
  }

  if (!rec.compositionWork) {
    issues.push({
      id: uuidv4(),
      recordingId: rec.id || "",
      type: "no_composition_work",
      severity: "high",
      title: "No linked composition",
      description:
        "There's no composition work tied to this recording. Publishing royalties require a registered composition.",
      actionLabel: "Create composition",
      resolved: false,
    });
  }

  if (!rec.releaseDate) {
    issues.push({
      id: uuidv4(),
      recordingId: rec.id || "",
      type: "missing_release_date",
      severity: "medium",
      title: "Missing release date",
      description:
        "No release date is set. Some registries require this to process claims.",
      actionLabel: "Add release date",
      resolved: false,
    });
  }

  issues.push({
    id: uuidv4(),
    recordingId: rec.id || "",
    type: "missing_writer",
    severity: "high",
    title: "Missing songwriter info",
    description:
      "No songwriter is listed for this song. Without writer info, you can't collect publishing royalties.",
    actionLabel: "Add songwriter",
    resolved: false,
  });

  return issues;
}

function parseCSVToRecordings(data: Record<string, string>[]): Recording[] {
  return data.map((row) => {
    const id = uuidv4();
    const title =
      row["Title"] ||
      row["title"] ||
      row["Song Title"] ||
      row["song_title"] ||
      row["Track"] ||
      "Untitled";
    const artist =
      row["Artist"] ||
      row["artist"] ||
      row["Artist Name"] ||
      row["artist_name"] ||
      "Unknown Artist";
    const album =
      row["Album"] ||
      row["album"] ||
      row["Album Title"] ||
      row["album_title"] ||
      "Unknown Album";
    const isrc = row["ISRC"] || row["isrc"] || null;
    const releaseDate =
      row["Release Date"] || row["release_date"] || row["Date"] || null;
    const duration = row["Duration"] || row["duration"] || null;

    const partial: Partial<Recording> = {
      id,
      title,
      artist,
      album,
      isrc,
      releaseDate,
      duration,
      compositionWork: null,
      issues: [],
    };
    const issues = detectIssues(partial);
    const score = scoreRecording({ ...partial, issues });

    return {
      id,
      title,
      artist,
      album,
      isrc,
      releaseDate,
      duration,
      claimReadinessScore: score,
      issues,
      compositionWork: null,
      importedAt: new Date().toISOString().split("T")[0],
    };
  });
}

export default function ConnectPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { importRecordings, catalogImported, recordings } = useAppStore();
  const [importing, setImporting] = useState(false);
  const [spotifyImporting, setSpotifyImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    count: number;
    issues: number;
    source: string;
    updated?: number;
    pruned?: number;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [artistName, setArtistName] = useState("");
  const [syncSpotifySnapshot, setSyncSpotifySnapshot] = useState(true);
  const [connectingSpotify, setConnectingSpotify] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");
    const reauth = params.get("reauth");

    if (authError === "spotify") {
      setAuthFeedback(
        "Spotify sign-in did not complete. Try again, and if Spotify shows an approval error, double-check the app permissions in your Spotify account."
      );
      return;
    }

    if (reauth === "1") {
      setAuthFeedback(
        "Your previous session expired. Sign in with Spotify again to keep working."
      );
      return;
    }

    setAuthFeedback(null);
  }, []);

  const handleSpotifyImport = useCallback(async () => {
    if (!session?.user) {
      setImportError("Connect your Spotify account before importing.");
      return;
    }

    setSpotifyImporting(true);
    setImportError(null);

    try {
      const effectiveArtistName = artistName.trim();
      if (!effectiveArtistName) {
        throw new Error("Paste your Spotify artist URL or exact artist name before importing.");
      }

      const res = await fetch(`/api/spotify/tracks?artistName=${encodeURIComponent(effectiveArtistName)}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Spotify import failed. Check your connection and try again.");
      }

      const data = await res.json();
      const tracks: SpotifyTrackData[] = data.tracks;
      const newRecordings = spotifyTracksToRecordings(tracks);
      importRecordings(newRecordings, {
        pruneMissingSpotify: syncSpotifySnapshot,
      });
      const totalIssues = newRecordings.reduce(
        (sum, recording) => sum + recording.issues.length,
        0
      );
      setImportResult({
        count: newRecordings.length,
        issues: totalIssues,
        source: "Spotify",
        pruned: syncSpotifySnapshot ? undefined : 0,
      });
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Spotify import failed. Please try again."
      );
    } finally {
      setSpotifyImporting(false);
    }
  }, [artistName, importRecordings, session?.user, syncSpotifySnapshot]);

  const handleSpotifyLogin = useCallback(async () => {
    setConnectingSpotify(true);
    setImportError(null);

    try {
      await startSpotifySignIn("/dashboard");
    } catch (error) {
      setImportError(
        error instanceof Error
          ? `Spotify sign-in failed: ${error.message}`
          : "Spotify sign-in failed. Please try again."
      );
      setConnectingSpotify(false);
    }
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (!session?.user) {
        setImportError("Sign in with Spotify before importing a CSV so ClaimRail can save it to your account.");
        return;
      }

      setImporting(true);
      setImportError(null);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as Record<string, string>[];
          const newRecordings = parseCSVToRecordings(data);
          importRecordings(newRecordings);
          const totalIssues = newRecordings.reduce(
            (sum, recording) => sum + recording.issues.length,
            0
          );
          setImportResult({
            count: newRecordings.length,
            issues: totalIssues,
            source: "CSV",
          });
          setImporting(false);
        },
        error: () => {
          setImportError(
            "CSV import failed. Make sure the file is valid and try again."
          );
          setImporting(false);
        },
      });
    },
    [importRecordings, session?.user]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragActive(false);
      const file = event.dataTransfer.files[0];
      if (file && file.name.endsWith(".csv")) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const isSpotifyConnected = !!session?.user;

  return (
    <AppShell requireAuth={false}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Connect Your Catalog
          </h1>
          <p className="mt-1 text-muted-foreground">
            Import your music so we can find missing royalties. ClaimRail Pro is{" "}
            <strong>$20 per year</strong> for catalog tools, extension access, and automation features.
          </p>
        </div>

        {session?.user ? (
          <LaunchGuideCard
            title="Best way to get your account fully working"
            description="This page is the front door. Once your songs are in, ClaimRail can audit them, prep registrations, and feed the automation queue."
            steps={[
              {
                title: "Keep Spotify connected",
                detail: "Spotify is the fastest path because it usually brings in titles, release dates, and ISRCs automatically.",
                complete: isSpotifyConnected,
              },
              {
                title: "Import at least one catalog source",
                detail: "Use Spotify or CSV, then head straight to Audit to see what still blocks registration.",
                href: "/audit",
                hrefLabel: "Open Audit",
                complete: catalogImported && recordings.length > 0,
              },
              {
                title: "Continue to registration setup",
                detail: "After import, save BMI credentials in Settings and use Register for prep or autonomous queueing.",
                href: "/dashboard/settings",
                hrefLabel: "Open Settings",
              },
            ]}
            tip="CSV uploads work best when you include Title, Artist, Album, ISRC, and Release Date. Missing writer or composition data can still be fixed later in the app."
          />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Zap className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">One-click import</p>
              <p className="text-xs text-muted-foreground">
                Import your artist catalog or upload a distributor CSV
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Shield className="h-5 w-5 shrink-0 text-success" />
            <div>
              <p className="text-sm font-medium">Gap detection</p>
              <p className="text-xs text-muted-foreground">
                We flag likely BMI and Songtrust prep work
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <DollarSign className="h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium">Free until you earn</p>
              <p className="text-xs text-muted-foreground">
                Flat $20/year for ClaimRail Pro
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-2 border-[#1DB954]/30 bg-[#1DB954]/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1DB954">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                  Connect Spotify
                </CardTitle>
                <Badge variant="success">Recommended</Badge>
              </div>
              <CardDescription>
                Log in with Spotify to import your artist catalog - albums and singles
                released under your Spotify artist profile, not your liked songs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSpotifyConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg border border-[#1DB954]/30 bg-background p-3">
                    {session.user?.image && (
                      <Image
                        src={session.user.image}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium">{session.user?.name}</p>
                      <p className="text-xs text-success">Spotify connected</p>
                    </div>
                    <CheckCircle2 className="ml-auto h-5 w-5 text-success" />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Spotify artist page
                    </label>
                    <Input
                      value={artistName}
                      onChange={(event) => setArtistName(event.target.value)}
                      placeholder="Artist name, Spotify artist URL, or spotify:artist:ID"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      We import from your artist page, not your listener profile. The safest option is to paste your exact Spotify artist URL.
                    </p>
                  </div>

                  <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                    <Checkbox
                      checked={syncSpotifySnapshot}
                      onCheckedChange={(checked) => setSyncSpotifySnapshot(checked === true)}
                    />
                    <span className="space-y-1">
                      <span className="block text-sm font-medium">
                        Refresh my Spotify snapshot
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Removes stale Spotify-imported rows that are no longer on this artist page, while keeping songs you&apos;ve already enriched with composition data.
                      </span>
                    </span>
                  </label>

                  {importResult?.source === "Spotify" ? (
                    <div className="flex flex-col items-center gap-3 rounded-lg border p-6">
                      <CheckCircle2 className="h-8 w-8 text-success" />
                      <p className="text-center text-sm font-medium">
                        Imported {importResult.count} songs -{" "}
                        {importResult.issues} issues found
                      </p>
                      {syncSpotifySnapshot ? (
                        <p className="text-center text-xs text-muted-foreground">
                          The latest import also refreshed your Spotify snapshot so outdated Spotify-only rows can be cleared automatically on sync.
                        </p>
                      ) : null}
                      <Button onClick={() => router.push("/audit")}>
                        View Audit Results
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleSpotifyImport}
                      disabled={spotifyImporting}
                      className="w-full gap-2 bg-[#1DB954] text-white hover:bg-[#1ed760]"
                      size="lg"
                    >
                      {spotifyImporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Music className="h-4 w-4" />
                      )}
                      {spotifyImporting
                        ? "Importing your releases..."
                        : "Import My Spotify Releases"}
                    </Button>
                  )}

                  <p className="text-center text-xs text-muted-foreground">
                    We&apos;ll scan albums, singles, and compilations tied to that Spotify artist page and flag songs that likely still need BMI or Songtrust registration work.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button
                    onClick={handleSpotifyLogin}
                    disabled={connectingSpotify}
                    className="w-full gap-2 bg-[#1DB954] text-white hover:bg-[#1ed760]"
                    size="lg"
                  >
                    {connectingSpotify ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                      </svg>
                    )}
                    {connectingSpotify ? "Redirecting to Spotify..." : "Log in with Spotify"}
                  </Button>
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      Spotify sign-in only authenticates your ClaimRail account. The catalog import reads public artist-page data and never posts back to Spotify.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Upload CSV File
              </CardTitle>
              <CardDescription>
                Don&apos;t use Spotify? Export your catalog from DistroKid or any
                distributor as CSV.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
              >
                {importing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">
                      Importing your catalog...
                    </p>
                  </div>
                ) : importResult?.source === "CSV" ? (
                  <div className="flex flex-col items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                    <p className="text-sm font-medium">
                      Imported {importResult.count} songs with{" "}
                      {importResult.issues} issues detected
                    </p>
                    <Button
                      onClick={() => router.push("/audit")}
                      className="mt-2"
                    >
                      View Audit Results
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
                    <p className="mb-1 text-sm font-medium">
                      Drag & drop your CSV file here
                    </p>
                    <p className="mb-4 text-xs text-muted-foreground">
                      or click to browse
                    </p>
                    <Input
                      type="file"
                      accept=".csv"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      onChange={handleFileInput}
                    />
                    <Button variant="outline" size="sm">
                      Choose File
                    </Button>
                  </>
                )}
              </div>

              <div className="mt-4 rounded-lg bg-muted p-3">
                <p className="mb-1.5 text-xs font-medium">Expected columns:</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Title", "Artist", "Album", "ISRC", "Release Date"].map(
                    (column) => (
                      <Badge
                        key={column}
                        variant="outline"
                        className="text-[10px]"
                      >
                        {column}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {(authFeedback || importError) && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="py-4 text-sm text-destructive">
              {importError || authFeedback}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What Happens After You Connect</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  1
                </div>
                <p className="text-sm font-medium">We scan your catalog</p>
                <p className="text-xs text-muted-foreground">
                  Every song is checked for missing metadata
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  2
                </div>
                <p className="text-sm font-medium">Review likely gaps</p>
                <p className="text-xs text-muted-foreground">
                  We highlight songs that still need publishing setup
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  3
                </div>
                <p className="text-sm font-medium">Prepare registration data</p>
                <p className="text-xs text-muted-foreground">
                  We generate the metadata your backend can submit
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  4
                </div>
                <p className="text-sm font-medium">You get paid</p>
                <p className="text-xs text-muted-foreground">
                  Royalties flow. ClaimRail stays a simple $20/year plan.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-6 py-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <DollarSign className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold">Free to use. Always.</p>
              <p className="text-sm text-muted-foreground">
                Scan your catalog, find issues, and fix metadata with one simple
                <strong> $20/year subscription</strong>. No payout percentage and no commission on recovered royalties.
              </p>
            </div>
            <Badge variant="default" className="shrink-0 px-4 py-2 text-base">
              $20/year
            </Badge>
          </CardContent>
        </Card>

        {catalogImported && recordings.length > 0 && !importResult && (
          <Card className="border-success/50 bg-success/5">
            <CardContent className="flex items-center gap-4 py-4">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium">Catalog already imported</p>
                <p className="text-xs text-muted-foreground">
                  {recordings.length} songs in your catalog. You can import
                  additional songs above.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => router.push("/audit")}
              >
                View Audit
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
