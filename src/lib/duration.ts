/**
 * A length, to read: "6h", "1h 2m 5s", "4m 5s", "45s". Parts that are zero
 * are left out, so a six-hour session is not "360:00".
 */
export function formatDuration(seconds: number) {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  const parts = [
    [Math.floor(total / 3600), "h"],
    [Math.floor((total % 3600) / 60), "m"],
    [total % 60, "s"],
  ]
    .filter(([value]) => value)
    .map(([value, unit]) => `${value}${unit}`);
  return parts.length > 0 ? parts.join(" ") : "0s";
}

/** A player's clock: "4:05", or "6:00:00" past an hour. */
export function formatClockTime(seconds: number) {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(mins).padStart(2, "0")}:${secs}` : `${mins}:${secs}`;
}
