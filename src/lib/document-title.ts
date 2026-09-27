/**
 * Tab titles, by route.
 *
 * The app ships one static `<title>Alvastudio</title>` in index.html, so every
 * route read the same in the tab bar, in history and in a bookmark. This is the
 * one table that fixes that; pages do not set their own, because a title set in
 * a page body runs after the route has already painted and flickers.
 *
 * Longest matching prefix wins, so `/annotator/sessions/:id` picks the
 * workspace rather than the queue.
 */

const SUFFIX = "Alvastudio";

const TITLES: Array<[path: string, title: string]> = [
  ["/login", "Sign in"],
  ["/contributor/signup", "Create your account"],
  ["/intern/signup", "Create an intern account"],
  ["/forgot-password", "Reset your password"],

  ["/contributor/dashboard", "Home"],
  ["/contributor/studio", "Studio"],
  ["/contributor/notifications", "Notifications"],
  ["/contributor/profile", "Settings"],

  ["/intern/dashboard", "Home"],
  ["/intern/record", "Record focus group"],
  ["/intern/participants", "Participants"],
  ["/intern/review", "Review queue"],
  ["/intern/profile", "Settings"],

  ["/annotator/dashboard", "Home"],
  ["/annotator/sessions", "Sessions"],
  ["/annotator/profile", "Settings"],

  ["/admin/dashboard", "Admin"],
  ["/admin/prompts", "Prompts and stimuli"],
  ["/admin/users", "Users"],
  ["/admin/corpus", "Corpus"],
  ["/admin/reviews", "Reviews"],
  ["/admin/annotations", "Annotations"],
  ["/admin/focus-groups", "Focus groups"],
  ["/admin/payments", "Payments"],
  ["/admin/audio", "Audio QC"],
  ["/admin/settings", "Settings"],
];

/** Deeper routes that are not a prefix of their parent's label. */
const EXACT_OVERRIDES: Array<[test: RegExp, title: string]> = [
  [/^\/annotator\/sessions\/[^/]+$/, "Annotation workspace"],
  [/^\/intern\/review\/[^/]+$/, "Reviewing a clip"],
];

export function titleForPath(pathname: string): string {
  for (const [test, title] of EXACT_OVERRIDES) {
    if (test.test(pathname)) return `${title} · ${SUFFIX}`;
  }

  let best = "";
  let match = "";
  for (const [path, title] of TITLES) {
    const hit = pathname === path || pathname.startsWith(`${path}/`);
    if (hit && path.length > best.length) {
      best = path;
      match = title;
    }
  }

  if (!match) return SUFFIX;
  return `${match} · ${SUFFIX}`;
}
