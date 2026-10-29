/**
 * What each role is running.
 *
 * One version per role rather than one for the app, because the roles ship on
 * different clocks: the annotation workspace landed while the contributor
 * studio had not changed in weeks, and a single number would have told a
 * contributor their app had been updated when nothing they touch had moved.
 *
 * Bumped by hand, and only for work somebody would notice. A patch fix does
 * not earn a line here; a new surface, a new flow or a new capability does.
 * The point of the number is to be the thing somebody reads out in a support
 * message, so it has to mean the same thing to them as it does to us.
 */

export const COMPANY = "Alva Studio";

export type RoleVersion = {
  version: string;
  /** What that version brought, in the words of somebody using it. */
  released: string;
  notes: string[];
};

export const APP_VERSIONS = {
  contributor: {
    version: "2.0.0",
    released: "2026-10-29",
    notes: [
      "New pay: ₦10 a sentence, ₦5,000 per hour of speech",
      "Paid on Sundays, once you pass ₦5,000",
      "200 sentences and 15 minutes of narration a day",
      "Narration takes stop themselves at 2 minutes",
      "A guide to getting your recordings approved",
    ],
  },
  intern: {
    version: "1.4.0",
    released: "2026-10-28",
    notes: [
      "Your queue shows your work, not the whole team's",
      "Set a new password from the emailed link",
      "Redact a participant from a session",
      "Record consent without leaving the session",
    ],
  },
  annotator: {
    version: "1.3.1",
    released: "2026-10-28",
    notes: [
      "Set a new password from the emailed link",
      "Sign up without waiting for an invitation",
      "Workspace blocks writes while consent is missing, and says so",
      "Change your own password",
      "Give feedback from your profile",
    ],
  },
  admin: {
    version: "1.8.0",
    released: "2026-10-29",
    notes: [
      "Back-pay everyone at the new rates",
      "Tell contributors to redo their ID check",
      "Close sign-ups when the platform is full",
      "Account recovery queue, with real delivery status",
      "Sign-ins and sign-outs in the audit log",
      "Feedback from every role, in one table",
    ],
  },
} as const satisfies Record<string, RoleVersion>;

export type VersionedRole = keyof typeof APP_VERSIONS;

export function versionFor(role: string | undefined): RoleVersion | null {
  if (!role) return null;
  return APP_VERSIONS[role as VersionedRole] ?? null;
}
