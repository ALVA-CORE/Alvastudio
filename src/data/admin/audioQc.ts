import { round1 } from "@/data/admin/shared";

/**
 * Stands in for `/audio/analyze` + `/audio/transcribe` + `/audio/quality-score`.
 *
 * Those three are behind an optional ML stack that returns 503 when it is not
 * installed, so the QC bench needs something to show while it is not. Results
 * are derived from the filename, so the same clip reads the same twice: a
 * scoring bench that gives a different answer each run is not a bench.
 */

export type QcResult = {
  filename: string;
  durationSec: number;
  sampleRate: number;
  snrDb: number;
  silenceRatio: number;
  clippingRatio: number;
  qualityScore: number;
  transcript: string;
  relevance: number;
};

export function fakeAnalyse(file: File): QcResult {
  let hash = 0;
  for (let i = 0; i < file.name.length; i += 1) {
    hash = (hash * 31 + file.name.charCodeAt(i)) % 100000;
  }
  const unit = (offset: number) => ((hash + offset * 7919) % 1000) / 1000;

  return {
    filename: file.name,
    durationSec: round1(6 + unit(1) * 40),
    sampleRate: unit(2) > 0.5 ? 48000 : 16000,
    snrDb: round1(8 + unit(3) * 26),
    silenceRatio: round1(unit(4) * 0.4),
    clippingRatio: round1(unit(5) * 0.06),
    qualityScore: round1(0.45 + unit(6) * 0.5),
    transcript:
      "The traffic for Lagos island go always choke by seven a.m., especially when rain fall.",
    relevance: round1(0.5 + unit(7) * 0.5),
  };
}
