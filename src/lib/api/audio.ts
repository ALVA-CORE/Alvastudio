import { apiFetch } from "./client";

/**
 * The ML scoring tools.
 *
 * All three are behind an optional stack and answer **503** when it is not
 * installed. That is a normal deployment state, not an outage — `ApiError`
 * marks it with `isUnavailable` so the bench can say so plainly rather than
 * showing a failure.
 *
 * `quality-score` is the one worth running: it does what the other two do and
 * adds the scores. The other two exist for checking a single step.
 */

export type ApiAudioQc = {
  accepted: boolean;
  duration_seconds: number;
  trimmed_duration_seconds: number;
  silence_ratio: number | null;
  reasons: string[];
};

export type ApiTranscription = {
  transcript: string;
  speech_detected: boolean;
  duration_seconds: number;
  trimmed_duration_seconds: number;
  sample_rate: number;
};

export type ApiQualityScore = {
  accepted: boolean;
  quality_score: number | null;
  snr_db: number | null;
  duration_seconds: number;
  trimmed_duration_seconds: number;
  silence_ratio: number | null;
  transcript: string | null;
  /** How close the transcript is to the prompt. Null without a prompt. */
  embedding_score: number | null;
  llm_score: number | null;
  reasons: string[];
};

function upload<T>(path: string, file: File, extra: Record<string, string> = {}) {
  const form = new FormData();
  form.append("file", file);
  for (const [key, value] of Object.entries(extra)) form.append(key, value);
  return apiFetch<T>(path, { method: "POST", form });
}

export const analyseAudio = (file: File) =>
  upload<ApiAudioQc>("/audio/analyze", file);

export const transcribeAudio = (file: File) =>
  upload<ApiTranscription>("/audio/transcribe", file);

/** `prompt` turns on relevance scoring; without it `embedding_score` is null. */
export const scoreAudio = (file: File, prompt?: string) =>
  upload<ApiQualityScore>("/audio/quality-score", file, prompt ? { prompt } : {});
