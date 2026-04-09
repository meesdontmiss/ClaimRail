import { v4 as uuidv4 } from "uuid";
import { Recording, CatalogIssue } from "./types";

export interface SpotifyTrackData {
  spotifyId: string;
  title: string;
  artist: string;
  album: string;
  isrc: string | null;
  releaseDate: string | null;
  duration: string | null;
  albumArt: string | null;
}

export interface ImportedTrackData {
  spotifyId?: string | null;
  title: string;
  artist: string;
  album: string;
  isrc: string | null;
  releaseDate: string | null;
  duration: string | null;
  albumArt?: string | null;
}

function detectIssuesForSpotifyTrack(rec: {
  id: string;
  isrc: string | null;
  releaseDate: string | null;
}): CatalogIssue[] {
  const issues: CatalogIssue[] = [];

  if (!rec.isrc) {
    issues.push({
      id: uuidv4(),
      recordingId: rec.id,
      type: "missing_isrc",
      severity: "high",
      title: "Missing ISRC code",
      description:
        "This recording has no ISRC. Without it, royalty systems can't match payments to this song.",
      actionLabel: "Add ISRC",
      resolved: false,
    });
  }

  if (!rec.releaseDate) {
    issues.push({
      id: uuidv4(),
      recordingId: rec.id,
      type: "missing_release_date",
      severity: "medium",
      title: "Missing release date",
      description:
        "No release date is set. Some registries require this to process claims.",
      actionLabel: "Add release date",
      resolved: false,
    });
  }

  // Every imported track needs composition work created
  issues.push({
    id: uuidv4(),
    recordingId: rec.id,
    type: "no_composition_work",
    severity: "high",
    title: "No linked composition",
    description:
      "There's no composition work tied to this recording. Publishing royalties require a registered composition.",
    actionLabel: "Create composition",
    resolved: false,
  });

  // Every imported track needs writer info
  issues.push({
    id: uuidv4(),
    recordingId: rec.id,
    type: "missing_writer",
    severity: "high",
    title: "Missing songwriter info",
    description:
      "No songwriter is listed for this song. Without writer info, you can't collect publishing royalties.",
    actionLabel: "Add songwriter",
    resolved: false,
  });

  // Check for PRO/admin registration
  issues.push({
    id: uuidv4(),
    recordingId: rec.id,
    type: "missing_pro_admin",
    severity: "high",
    title: "Not registered with BMI/ASCAP or Songtrust",
    description:
      "This song isn't registered with a PRO or publishing admin. Performance and mechanical royalties are likely going uncollected.",
    actionLabel: "Register now",
    resolved: false,
  });

  return issues;
}

export function importedTracksToRecordings(
  tracks: ImportedTrackData[]
): Recording[] {
  return tracks.map((track) => {
    const id = uuidv4();
    const issues = detectIssuesForSpotifyTrack({
      id,
      isrc: track.isrc,
      releaseDate: track.releaseDate,
    });

    // Score: start low since no composition/writer/PRO data exists yet
    let score = 0;
    if (track.isrc) score += 15;
    if (track.releaseDate) score += 10;
    // Max initial score from Spotify import is ~25 (has ISRC + release date)

    return {
      id,
      spotifyId: track.spotifyId ?? null,
      title: track.title,
      artist: track.artist,
      album: track.album,
      albumArt: track.albumArt ?? null,
      isrc: track.isrc,
      releaseDate: track.releaseDate,
      duration: track.duration,
      claimReadinessScore: score,
      issues,
      compositionWork: null,
      importedAt: new Date().toISOString().split("T")[0],
    };
  });
}

export function spotifyTracksToRecordings(
  tracks: SpotifyTrackData[]
): Recording[] {
  return importedTracksToRecordings(tracks);
}
