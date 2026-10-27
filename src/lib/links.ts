/**
 * Everywhere the app points outside itself.
 *
 * One file, because these turn up in a sign-up checkbox, a profile row, a
 * wallet sheet and a guide, and a URL typed four times is a URL that is
 * wrong in one of them. They are the marketing site's pages, not ours —
 * nothing here is a route.
 */

export const ALVA_LINKS = {
  terms: "https://www.alvacoreai.com/terms",
  privacy: "https://www.alvacoreai.com/privacy",
  /** How contributors get paid: rates, milestones, when money moves. */
  payments: "https://www.alvacoreai.com/payments",
} as const;

export const SUPPORT_EMAIL = "support@alvacoreai.com";

/** `mailto:`, with a subject so support can sort it without asking. */
export function supportMailto(subject?: string) {
  return subject
    ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`
    : `mailto:${SUPPORT_EMAIL}`;
}
