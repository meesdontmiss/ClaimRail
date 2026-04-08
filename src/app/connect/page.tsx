"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Papa from "papaparse";
import { v4 as uuidv4 } from "uuid";
import { useAppStore } from "@/lib/store";
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
import {
  ArrowRight,
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  Mail,
  Music,
  Shield,
  DollarSign,
  Database,
  FolderTree,
  Plus,
  X,
} from "lucide-react";
import { signIn } from "next-auth/react";

type ArtistSourcePlatform =
  | "spotify"
  | "apple-music"
  | "youtube-music"
  | "soundcloud"
  | "tidal";

type ArtistSourceInput = {
  id: string;
  platform: ArtistSourcePlatform;
  value: string;
  confirmed: boolean;
};

const ARTIST_SOURCE_OPTIONS: Array<{
  value: ArtistSourcePlatform;
  label: string;
  importReady: boolean;
}> = [
  { value: "spotify", label: "Spotify", importReady: true },
  { value: "apple-music", label: "Apple Music", importReady: false },
  { value: "youtube-music", label: "YouTube Music", importReady: false },
  { value: "soundcloud", label: "SoundCloud", importReady: false },
  { value: "tidal", label: "TIDAL", importReady: false },
];

function getSourcePlaceholder(platform: ArtistSourcePlatform) {
  const option = ARTIST_SOURCE_OPTIONS.find((item) => item.value === platform);
  const label = option?.label ?? "Artist";
  return `${label} artist page URL or exact artist name`;
}

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
  const { data: session, status } = useSession();
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
  const [artistSources, setArtistSources] = useState<ArtistSourceInput[]>([
    { id: uuidv4(), platform: "spotify", value: "", confirmed: false },
    { id: uuidv4(), platform: "apple-music", value: "", confirmed: false },
  ]);
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);

  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";
  const confirmedSources = artistSources.filter(
    (source) => source.confirmed && source.value.trim()
  );
  const confirmedSpotifySource = confirmedSources.find(
    (source) => source.platform === "spotify"
  );
  const canStartArtistIntake = isAuthenticated && !!confirmedSpotifySource;

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");
    const reauth = params.get("reauth");
    const callbackUrl = params.get("callbackUrl");

    if (status === "loading") {
      return;
    }

    if (status === "authenticated" && callbackUrl) {
      try {
        const redirectUrl = new URL(callbackUrl, window.location.origin);

        if (redirectUrl.origin === window.location.origin) {
          router.replace(`${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`);
          return;
        }
      } catch {
        router.replace("/dashboard");
        return;
      }

      router.replace("/dashboard");
      return;
    }

    if (authError) {
        const errorMessages: Record<string, string> = {
        OAuthSignin:
          "ClaimRail could not start the sign-in process. Try again in a fresh tab.",
        OAuthCallback:
          "The sign-in provider sent you back, but ClaimRail could not finish the callback. This usually means an OAuth credential or redirect setting is off.",
        OAuthCreateAccount:
          "Authentication succeeded, but ClaimRail could not create your account record.",
        Callback:
          "ClaimRail received the callback, but the sign-in session could not be finalized.",
        AccessDenied:
          "Access was denied before ClaimRail could finish signing you in.",
        Configuration:
          "ClaimRail's authentication settings are incomplete in this environment.",
        Verification:
          "The sign-in verification step expired before it could finish. Try again.",
        Default:
          "ClaimRail sign-in did not complete. Try again, and if it keeps happening, this is a server-side auth issue.",
      };

      setAuthFeedback(
        errorMessages[authError] ?? errorMessages.Default
      );
      return;
    }

    if (reauth === "1") {
      setAuthFeedback(
        "Your previous session expired. Sign in again to keep working."
      );
      return;
    }

    if (callbackUrl && !session?.user) {
      setAuthFeedback(
        "ClaimRail sign-in started but did not finish. Try again, and if the provider returns you here, clear old cookies for claim-rail.vercel.app and retry."
      );
      return;
    }

    setAuthFeedback(null);
  }, [router, session?.user, status]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");

    if (!authError) {
      return;
    }

    let cancelled = false;

    void fetch("/api/debug/auth-events/latest", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return response.json() as Promise<{
          event: {
            level: string;
            message: string;
            payload: unknown;
            createdAt: string;
          } | null;
        }>;
      })
      .then((result) => {
        if (cancelled || !result?.event) {
          return;
        }

        const event = result.event;
        const detail = JSON.stringify(event.payload);
        setAuthFeedback((current) =>
          current
            ? `${current}\n\nLatest auth debug:\n${event.message}\n${detail}`
            : `Latest auth debug:\n${event.message}\n${detail}`
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const updateArtistSource = useCallback(
    (
      id: string,
      updates: Partial<Pick<ArtistSourceInput, "platform" | "value" | "confirmed">>
    ) => {
      setArtistSources((current) =>
        current.map((source) =>
          source.id === id
            ? {
                ...source,
                ...updates,
                confirmed:
                  updates.value !== undefined && updates.value.trim() === ""
                    ? false
                    : updates.confirmed ?? source.confirmed,
              }
            : source
        )
      );
    },
    []
  );

  const addArtistSource = useCallback(() => {
    setArtistSources((current) => [
      ...current,
      { id: uuidv4(), platform: "youtube-music", value: "", confirmed: false },
    ]);
  }, []);

  const removeArtistSource = useCallback((id: string) => {
    setArtistSources((current) => current.filter((source) => source.id !== id));
  }, []);

  const handleArtistImport = useCallback(async () => {
    if (!session?.user) {
      setImportError("Sign in to your ClaimRail account before importing from an artist page.");
      return;
    }

    if (!confirmedSpotifySource?.value.trim()) {
      setImportError("Confirm your Spotify artist page before starting artist intake.");
      return;
    }

    setSpotifyImporting(true);
    setImportError(null);

    try {
      const effectiveArtistName = confirmedSpotifySource.value.trim();
      const res = await fetch(`/api/spotify/tracks?artistName=${encodeURIComponent(effectiveArtistName)}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Artist-page import failed. Check the source and try again.");
      }

      const data = await res.json();
      const tracks: SpotifyTrackData[] = data.tracks;
      const newRecordings = spotifyTracksToRecordings(tracks);
      importRecordings(newRecordings, {
        pruneMissingSpotify: true,
      });
      const totalIssues = newRecordings.reduce(
        (sum, recording) => sum + recording.issues.length,
        0
      );
      setImportResult({
        count: newRecordings.length,
        issues: totalIssues,
        source: "Spotify",
      });
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Artist-page import failed. Please try again."
      );
    } finally {
      setSpotifyImporting(false);
    }
  }, [confirmedSpotifySource?.value, importRecordings, session?.user]);

  const handleGoogleLogin = useCallback(async () => {
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (error) {
      setImportError(
        error instanceof Error
          ? `Sign-in failed: ${error.message}`
          : "Sign-in failed. Please try again."
      );
    }
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (!session?.user) {
        setImportError("Sign in to ClaimRail before importing a CSV so it can be saved to your account.");
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

  if (isLoading) {
    return (
      <AppShell requireAuth={false}>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Checking session...
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell requireAuth={false}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Catalog Intake
          </h1>
          <p className="mt-1 text-muted-foreground">
            Bring in your source-of-truth catalog, compare sources, and move songs into the right claim workflow. ClaimRail Pro is{" "}
            <strong>$20 per year</strong> for catalog tools, extension access, and automation features.
          </p>
        </div>

        {isAuthenticated ? (
          <LaunchGuideCard
            title="Best way to get your account fully working"
            description="This page is the front door. Once your songs are in, ClaimRail can audit them, prep registrations, and feed the automation queue."
            steps={[
              {
                title: "Keep your account signed in",
                detail: "ClaimRail needs your account session active while you import catalog sources and save changes.",
                complete: isAuthenticated,
              },
            {
              title: "Import at least one catalog source",
              detail: "Use artist-page import or a distributor CSV, then head to your Dashboard to see what still blocks registration.",
              href: "/dashboard",
              hrefLabel: "Open Dashboard",
              complete: catalogImported && recordings.length > 0,
            },
            {
              title: "Route the next claim step after import",
              detail: "Once songs are in, your Dashboard shows what belongs in BMI automation, what needs The MLC, and what should go to a publishing admin.",
              href: "/dashboard",
              hrefLabel: "Open Dashboard",
            },
          ]}
          tip="CSV uploads work best when you include Title, Artist, Album, ISRC, and Release Date. Missing writer or composition data can still be fixed later in the app."
          />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Database className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Source-first intake</p>
              <p className="text-xs text-muted-foreground">
                Start from artist pages or distributor exports, not listener data
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <FolderTree className="h-5 w-5 shrink-0 text-success" />
            <div>
              <p className="text-sm font-medium">Rights routing</p>
              <p className="text-xs text-muted-foreground">
                We sort songs into BMI, The MLC, and publishing-admin lanes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <DollarSign className="h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium">Operator view</p>
              <p className="text-xs text-muted-foreground">
                ClaimRail prepares, queues, and hands off to official systems
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle>Catalog Sources</CardTitle>
                  <CardDescription>
                    Use the fastest source available today, then move into Audit and Claim Center once your songs are in.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
                    Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <Card className="border-dashed">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Account Access</CardTitle>
                    <Badge variant={isAuthenticated ? "success" : "secondary"}>
                      {isAuthenticated ? "Ready" : "Needed"}
                    </Badge>
                  </div>
                  <CardDescription>
                    ClaimRail needs an active account session before it can save imports, queue automation, or route songs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isAuthenticated ? (
                    <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                      {session?.user?.image ? (
                        <Image
                          src={session.user.image}
                          alt=""
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Shield className="h-4 w-4" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">{session?.user?.name || "Connected"}</p>
                        <p className="text-xs text-success">Account connected</p>
                      </div>
                      <CheckCircle2 className="ml-auto h-5 w-5 text-success" />
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-sm font-medium">Sign in before importing</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        ClaimRail uses Google sign-in for secure account access. This screen is for catalog intake and rights routing.
                      </p>
                    </div>
                  )}

                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm font-medium">Best order</p>
                    <ol className="mt-2 space-y-2 text-xs text-muted-foreground">
                      <li>1. Sign in and bring in one catalog source.</li>
                      <li>2. Open Audit to fix missing metadata and writer gaps.</li>
                      <li>3. Open Claim Center to route each song into the right lane.</li>
                    </ol>
                  </div>

                  {!isAuthenticated ? (
                    <Button
                      onClick={handleGoogleLogin}
                      className="w-full gap-2"
                      size="lg"
                    >
                      <Mail className="h-4 w-4" />
                      Sign in with Google
                    </Button>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-background">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Music className="h-4 w-4 text-[#1DB954]" />
                      Artist Sources
                    </CardTitle>
                    <Badge variant="outline">Spotify imports first</Badge>
                  </div>
                  <CardDescription>
                    Confirm the artist pages you want us to use. Spotify starts the real intake today. The other sources help us verify the footprint you want ClaimRail to reconcile next.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {artistSources.map((source, index) => {
                      const option = ARTIST_SOURCE_OPTIONS.find(
                        (item) => item.value === source.platform
                      );

                      return (
                        <div
                          key={source.id}
                          className="rounded-lg border border-white/10 bg-muted/20 p-3"
                        >
                          <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]">
                            <label className="space-y-1">
                              <span className="block text-xs font-medium text-muted-foreground">
                                Platform
                              </span>
                              <select
                                value={source.platform}
                                onChange={(event) =>
                                  updateArtistSource(source.id, {
                                    platform: event.target.value as ArtistSourcePlatform,
                                    confirmed: false,
                                  })
                                }
                                disabled={!isAuthenticated}
                                className="flex h-10 w-full rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {ARTIST_SOURCE_OPTIONS.map((platform) => (
                                  <option
                                    key={platform.value}
                                    value={platform.value}
                                    className="bg-[#111318] text-foreground"
                                  >
                                    {platform.label}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="space-y-1">
                              <span className="block text-xs font-medium text-muted-foreground">
                                Artist page
                              </span>
                              <Input
                                value={source.value}
                                onChange={(event) =>
                                  updateArtistSource(source.id, {
                                    value: event.target.value,
                                  })
                                }
                                placeholder={getSourcePlaceholder(source.platform)}
                                disabled={!isAuthenticated}
                              />
                            </label>

                            <div className="flex items-end gap-2">
                              <Button
                                type="button"
                                variant={source.confirmed ? "success" : "outline"}
                                onClick={() =>
                                  updateArtistSource(source.id, {
                                    confirmed: !source.confirmed && !!source.value.trim(),
                                  })
                                }
                                disabled={!isAuthenticated || !source.value.trim()}
                              >
                                {source.confirmed ? "Confirmed" : "Confirm"}
                              </Button>
                              {artistSources.length > 1 ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeArtistSource(source.id)}
                                  aria-label={`Remove source ${index + 1}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {option?.importReady
                                ? "This source can start catalog intake now."
                                : "This source is tracked for operator confirmation while multi-platform intake is being built."}
                            </span>
                            {source.confirmed ? (
                              <Badge variant="success">Ready</Badge>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addArtistSource}
                      disabled={!isAuthenticated || artistSources.length >= 4}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Platform
                    </Button>
                    <div className="flex items-center text-xs text-muted-foreground">
                      Confirm at least one Spotify artist page to start import.
                    </div>
                  </div>

                  {importResult?.source === "Spotify" ? (
                    <div className="flex flex-col items-start gap-3 rounded-lg border p-5">
                      <CheckCircle2 className="h-7 w-7 text-success" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          Imported {importResult.count} songs and found {importResult.issues} likely follow-up items.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Next step: review what is already in your BMI footprint, then route anything missing into BMI, The MLC, or publishing-admin prep.
                        </p>
                      </div>
                      <Button onClick={() => router.push("/dashboard")}>
                        Open Dashboard
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleArtistImport}
                      disabled={spotifyImporting || !canStartArtistIntake}
                      className="w-full gap-2"
                      size="lg"
                    >
                      {spotifyImporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Music className="h-4 w-4" />
                      )}
                      {spotifyImporting ? "Starting artist intake..." : "Start Artist Intake"}
                    </Button>
                  )}

                  <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
                    The full multi-platform reconciliation flow is not fully wired yet. Today, Spotify gives us the real release snapshot. Apple Music, YouTube Music, SoundCloud, and TIDAL are confirmation inputs for the next pass of intake.
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Distributor CSV
              </CardTitle>
              <CardDescription>
                Upload a catalog export from DistroKid or another distributor when you want ClaimRail to start from your release ledger instead of a public storefront.
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
                    <p className="text-center text-sm font-medium">
                      Imported {importResult.count} songs with{" "}
                      {importResult.issues} likely follow-up items detected
                    </p>
                    <Button
                      onClick={() => router.push("/dashboard")}
                      className="mt-2"
                    >
                      Open Dashboard
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
                      disabled={!isAuthenticated}
                    />
                    <Button variant="outline" size="sm" disabled={!isAuthenticated}>
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

              <div className="mt-4 rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
                Use this when you want the strongest source-of-truth baseline for release records, ownership cleanup, and future reconciliation across rights systems.
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

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What Happens After Intake</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    1
                  </div>
                  <p className="text-sm font-medium">ClaimRail normalizes the catalog</p>
                  <p className="text-xs text-muted-foreground">
                    Titles, release metadata, ISRCs, and source IDs are matched into one working catalog
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    2
                  </div>
                  <p className="text-sm font-medium">Audit flags what blocks money</p>
                  <p className="text-xs text-muted-foreground">
                    Missing writers, compositions, dates, or IDs get surfaced before you submit anything
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    3
                  </div>
                  <p className="text-sm font-medium">Claim Center routes the lane</p>
                  <p className="text-xs text-muted-foreground">
                    Each song is pushed toward BMI, The MLC, or publishing-admin follow-through
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    4
                  </div>
                  <p className="text-sm font-medium">Official systems stay the destination</p>
                  <p className="text-xs text-muted-foreground">
                    ClaimRail prepares and automates the work, but payouts still come from the real collecting systems
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Source strategy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border p-4">
                <p className="font-medium text-foreground">Use artist-page import when:</p>
                <p className="mt-1">
                  You need the fastest live storefront snapshot and want ClaimRail to bring in public release metadata quickly.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium text-foreground">Use distributor CSV when:</p>
                <p className="mt-1">
                  You want the stronger source-of-truth baseline for ownership, release records, and reconciliation.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium text-foreground">Best practice:</p>
                <p className="mt-1">
                  Start with whichever source is easiest today, then enrich and reconcile over time instead of waiting for a perfect first import.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

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
                onClick={() => router.push("/dashboard")}
              >
                View Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
