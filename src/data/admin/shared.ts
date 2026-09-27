/**
 * Sample data for the admin surface.
 *
 * Every number here is invented. It exists so the screens can be designed and
 * reviewed before the endpoints that would fill them are finished — several do
 * not exist yet (see docs/backend-gaps.md), and the ones that do are near-empty
 * on staging, which shows nothing about how a screen reads when it is full.
 *
 * Each dataset is shaped as the real response will be, so swapping it for a
 * fetch is a change of source rather than a rewrite of the page.
 */

/** Deterministic, so a re-render does not reshuffle a table or restart a chart. */
export function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export function pick<T>(random: () => number, options: readonly T[]): T {
  return options[Math.floor(random() * options.length)];
}

export const NIGERIAN_NAMES = [
  "Chioma Okafor", "Tunde Adeyemi", "Amaka Nwosu", "Ibrahim Bello",
  "Blessing Uche", "Emeka Duru", "Fatima Sani", "Victor Oghene",
  "Ngozi Peters", "Suleiman Rabiu", "Grace Etim", "Halima Bashir",
  "Segun Alabi", "Precious Wills", "Musa Danladi", "Aisha Mohammed",
  "Chinedu Obi", "Zainab Kabir", "Bola Ogundele", "Joy Effiong",
] as const;

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
export function daysAgo(n: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - n);
  return date;
}

export function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** "3d ago" / "Yesterday" / "Just now" — the grammar the other tables use. */
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
