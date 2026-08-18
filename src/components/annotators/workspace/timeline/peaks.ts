/**
 * Per-clip waveform envelopes.
 *
 * These are SYNTHESISED, not decoded. The seeded demo audio is 9–14 seconds
 * while the sessions it stands in for run 18–47 minutes, so there is no real
 * signal to slice per segment. Rather than draw a flat rectangle, each clip gets a
 * deterministic speech-shaped envelope derived from its segment id — stable across
 * renders, distinct between clips, and honest about being a placeholder.
 *
 * REPLACE WITH: server-side peak extraction. A real pipeline emits a peaks file
 * alongside the audio (one normalised value per N samples); `segmentPeaks` then
 * becomes a slice of that array between the segment's start and end. Nothing else
 * in the timeline changes — it only ever consumes `number[]` in 0..1.
 */

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const peakCache = new Map<string, number[]>();

/**
 * A speech-like envelope in 0..1.
 *
 * Speech is syllabic: bursts of energy at roughly 3–6 Hz separated by troughs,
 * riding under a slower phrase-level arc that tapers at both ends. Layering
 * those two rates over light noise reads as a voice at a glance, where uniform
 * noise reads as static.
 */
export function segmentPeaks(segmentId: string, sampleCount: number): number[] {
  const key = `${segmentId}:${sampleCount}`;
  const cached = peakCache.get(key);
  if (cached) return cached;

  const random = seededRandom(hashString(segmentId));
  // Syllable rate and phase vary per clip so no two look alike.
  const syllableRate = 2.6 + random() * 3.4;
  const phase = random() * Math.PI * 2;
  const energy = 0.55 + random() * 0.4;

  const peaks = Array.from({ length: sampleCount }, (_, index) => {
    const t = sampleCount === 1 ? 0.5 : index / (sampleCount - 1);

    // Phrase arc — quick attack, slow decay, so clips do not look symmetric.
    const attack = Math.min(1, t / 0.06);
    const release = Math.min(1, (1 - t) / 0.12);
    const arc = Math.min(attack, release);

    // Syllabic modulation, rectified so troughs sit near zero.
    const syllable = Math.abs(Math.sin(phase + t * Math.PI * 2 * syllableRate));

    const noise = 0.72 + random() * 0.28;
    const value = arc * (0.28 + syllable * 0.72) * noise * energy;

    return Math.max(0.04, Math.min(1, value));
  });

  peakCache.set(key, peaks);
  return peaks;
}

/** Test seam. */
export function __clearPeakCache() {
  peakCache.clear();
}
