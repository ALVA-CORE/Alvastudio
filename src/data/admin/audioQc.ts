import { round1 } from "@/data/admin/shared";

/**
 * One scored clip, as the bench shows it.
 *
 * `POST /audio/quality-score` fills this. Fields it does not return are null
 * rather than invented: the bench exists to set thresholds, and a threshold
 * set against a made-up number is worse than no threshold.
 */

export type QcResult = {
  filename: string;
  accepted: boolean;
  durationSec: number;
  trimmedSec: number;
  snrDb: number | null;
  silenceRatio: number | null;
  qualityScore: number | null;
  transcript: string | null;
  /** How close the transcript came to the prompt, when one was given. */
  relevance: number | null;
  /** Why it was turned down. Empty when it was accepted. */
  reasons: string[];
};

export function toQcResult(
  filename: string,
  api: {
    accepted: boolean;
    quality_score: number | null;
    snr_db: number | null;
    duration_seconds: number;
    trimmed_duration_seconds: number;
    silence_ratio: number | null;
    transcript: string | null;
    embedding_score: number | null;
    reasons: string[];
  }
): QcResult {
  return {
    filename,
    accepted: api.accepted,
    durationSec: round1(api.duration_seconds),
    trimmedSec: round1(api.trimmed_duration_seconds),
    snrDb: api.snr_db === null ? null : round1(api.snr_db),
    silenceRatio: api.silence_ratio,
    qualityScore: api.quality_score,
    transcript: api.transcript,
    relevance: api.embedding_score,
    reasons: api.reasons,
  };
}

