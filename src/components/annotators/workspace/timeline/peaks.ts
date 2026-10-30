/**
 * The slice of the session's waveform that belongs to one segment.
 *
 * These are **measured**, not invented. `GET /annotations/{id}/source`
 * carries `waveform_peaks` — the real amplitude envelope of the recording,
 * one value per bucket across its whole length — and a segment's bars are
 * the part of that array covering its own seconds.
 *
 * It used to synthesise a speech-shaped curve from a hash of the segment
 * id: stable, distinct per clip, and matching nothing. That is a bad lie to
 * tell on this screen in particular, because annotators read the waveform
 * to find where speech starts and stops.
 *
 * **No peaks means flat bars**, not a guessed shape. The audio has not been
 * measured, and a wrong waveform is worse than an obviously empty one.
 */

/** What a flat bar looks like: low, even, clearly not a reading. */
const FLAT = 0.12;

export function segmentPeaks({
  peaks,
  durationSeconds,
  start,
  end,
  sampleCount,
}: {
  /** The whole recording's envelope, or null when unmeasured. */
  peaks: number[] | null | undefined;
  /** The whole recording's length, which maps seconds onto the array. */
  durationSeconds: number | null | undefined;
  /** This segment's bounds, in seconds. */
  start: number;
  end: number;
  sampleCount: number;
}): number[] {
  const count = Math.max(1, Math.round(sampleCount));

  if (!peaks?.length || !durationSeconds || durationSeconds <= 0) {
    return new Array(count).fill(FLAT);
  }

  const perSecond = peaks.length / durationSeconds;
  const from = Math.max(0, Math.floor(start * perSecond));
  const to = Math.min(peaks.length, Math.ceil(end * perSecond));

  /* A segment shorter than one bucket, or bounds outside the recording.
     Flat rather than a slice of nothing. */
  if (to <= from) return new Array(count).fill(FLAT);

  const span = to - from;

  return Array.from({ length: count }, (_, index) => {
    /* Each bar is the loudest point in the stretch it covers, which is what
       a waveform shows — averaging would flatten every peak into the
       silence around it. */
    const lo = from + Math.floor((index / count) * span);
    const hi = Math.max(lo + 1, from + Math.floor(((index + 1) / count) * span));

    let loudest = 0;
    for (let i = lo; i < hi && i < peaks.length; i += 1) {
      const value = peaks[i];
      if (Number.isFinite(value) && value > loudest) loudest = value;
    }

    return Math.min(1, Math.max(FLAT, loudest));
  });
}
