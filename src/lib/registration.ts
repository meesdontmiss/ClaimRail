import { Recording } from "./types";

export type RegistrationService = "bmi" | "ascap" | "sesac" | "songtrust" | "tunecore_pub" | "cd_baby_pro";

export interface RegistrationStatus {
  recordingId: string;
  songTitle: string;
  artist: string;
  bmiRegistered: boolean;
  songtrustRegistered: boolean;
  proRegistered: boolean;
  adminRegistered: boolean;
  estimatedAnnualLoss: number;
}

export interface RegistrationAction {
  id: string;
  recordingId: string;
  service: RegistrationService;
  serviceLabel: string;
  status: "unregistered" | "ready_to_submit" | "submitted" | "confirmed";
  songTitle: string;
  description: string;
}

/**
 * Simulate checking registration status against BMI/Songtrust.
 * In production this would query BMI's repertoire API and Songtrust's partner API.
 */
function normalizePro(pro: string | null | undefined) {
  return (pro || "").trim().toUpperCase();
}

export function checkRegistrationStatus(recordings: Recording[]): RegistrationStatus[] {
  return recordings.map((rec) => {
    const hasPro = rec.compositionWork?.proRegistered ?? false;
    const hasAdmin = rec.compositionWork?.adminRegistered ?? false;
    const hasBMI = hasPro && normalizePro(rec.compositionWork?.pro) === "BMI";

    // Estimate: unregistered songs lose ~$50-300/yr depending on streams
    const baseEstimate = 120;
    let loss = 0;
    if (!hasBMI) loss += baseEstimate * 0.6; // BMI performance royalties
    if (!hasAdmin) loss += baseEstimate * 0.4; // mechanical royalties

    return {
      recordingId: rec.id,
      songTitle: rec.title,
      artist: rec.artist,
      bmiRegistered: hasBMI,
      songtrustRegistered: hasAdmin,
      proRegistered: hasPro,
      adminRegistered: hasAdmin,
      estimatedAnnualLoss: Math.round(loss),
    };
  });
}

/**
 * Generate registration actions for unregistered songs.
 */
export function generateRegistrationActions(statuses: RegistrationStatus[]): RegistrationAction[] {
  const actions: RegistrationAction[] = [];

  for (const status of statuses) {
    if (!status.bmiRegistered) {
      actions.push({
        id: `reg-bmi-${status.recordingId}`,
        recordingId: status.recordingId,
        service: "bmi",
        serviceLabel: "BMI",
        status: "unregistered",
        songTitle: status.songTitle,
        description: `Register "${status.songTitle}" with BMI to collect performance royalties from radio, TV, streaming, and live venues.`,
      });
    }

    if (!status.songtrustRegistered) {
      actions.push({
        id: `reg-st-${status.recordingId}`,
        recordingId: status.recordingId,
        service: "songtrust",
        serviceLabel: "Songtrust",
        status: "unregistered",
        songTitle: status.songTitle,
        description: `Register "${status.songTitle}" with Songtrust to collect mechanical royalties from Spotify, Apple Music, and 40+ other global sources.`,
      });
    }
  }

  return actions;
}

/**
 * Generate BMI registration data for a song (what would be submitted to BMI's work registration).
 */
export function generateBMIRegistrationData(rec: Recording) {
  return {
    workTitle: rec.title,
    alternateTitles: [],
    writers: rec.compositionWork?.writers.map((w) => ({
      name: w.name,
      ipiNumber: w.ipi || "PENDING",
      role: w.role === "composer_lyricist" ? "Author/Composer" : w.role === "composer" ? "Composer" : "Author",
      publisherName: "",
      ownership: rec.compositionWork?.splits.find((s) => s.writerId === w.id)?.percentage || 0,
    })) || [],
    isrc: rec.isrc,
    performingArtist: rec.artist,
    releaseDate: rec.releaseDate,
  };
}

/**
 * Generate Songtrust registration data for a song.
 */
export function generateSongtrustRegistrationData(rec: Recording) {
  return {
    songTitle: rec.title,
    writers: rec.compositionWork?.writers.map((w) => ({
      firstName: w.name.split(" ")[0],
      lastName: w.name.split(" ").slice(1).join(" "),
      ipi: w.ipi || "",
      pro: w.pro || "",
      ownershipPercentage: rec.compositionWork?.splits.find((s) => s.writerId === w.id)?.percentage || 0,
    })) || [],
    isrc: rec.isrc,
    iswc: rec.compositionWork?.iswc || "",
    releaseDate: rec.releaseDate,
    language: "EN",
  };
}

/**
 * Calculate the 1% ClaimRail fee on a payout amount.
 */
export function calculateClaimRailFee(payoutAmount: number): {
  grossAmount: number;
  fee: number;
  netAmount: number;
  feePercentage: number;
} {
  const feePercentage = 0.01;
  const fee = Math.round(payoutAmount * feePercentage * 100) / 100;
  return {
    grossAmount: payoutAmount,
    fee,
    netAmount: Math.round((payoutAmount - fee) * 100) / 100,
    feePercentage: 1,
  };
}
