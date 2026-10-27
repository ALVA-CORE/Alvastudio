/**
 * Seconds as `m:ss`.
 *
 * All that is left of a `useAudioPlayer` hook that nothing used: every
 * player in the app owns its own element and its own transport, because
 * each wants different things from it (scrubbing, speed, segment bounds),
 * and a shared hook that satisfied all three satisfied none.
 */
export function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
