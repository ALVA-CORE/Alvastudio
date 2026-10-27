/**
 * Sample data for the admin surface.
 *
 * Every admin screen reads from the API now. What is left here is the helpers
 * those screens share, and the fixtures the tests build rows from, so a test
 * does not need the network.
 */

/** Deterministic, so a re-render does not reshuffle a table or restart a chart. */
export const STATES = [
  "Lagos", "FCT", "Rivers", "Kano", "Oyo", "Enugu", "Kaduna",
  "Delta", "Anambra", "Edo", "Plateau", "Cross River", "Borno", "Ogun",
] as const;

export const VARIETIES = ["Nigerian English", "Nigerian Pidgin"] as const;
export type Variety = (typeof VARIETIES)[number];

/** Rounds to one decimal without the float noise `toFixed` leaves in a number. */
export function round1(value: number) {
  return Math.round(value * 10) / 10;
}

/** `YYYY-MM-DD`, n days back from today. */
export function relativeDays(date: Date) {
  const hours = Math.floor((Date.now() - date.getTime()) / 36e5);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function formatHours(hours: number) {
  return `${round1(hours)}h`;
}

export function formatDuration(seconds: number) {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
