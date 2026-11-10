/**
 * Seconds as `m:ss`.
 *
 * All that is left of a `useAudioPlayer` hook that nothing used: every
 * player in the app owns its own element and its own transport, because
 * each wants different things from it (scrubbing, speed, segment bounds),
 * and a shared hook that satisfied all three satisfied none.
 */
export { formatClockTime as formatAudioTime } from "@/lib/duration";
