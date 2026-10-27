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
    version: "1.5.0",
    released: "2026-10-27",
    notes: [
      "Verify with your NIN document instead of a selfie",
      "The wallet keeps itself up to date while a review runs",
      "Milestone pay, and a gauge for the next ₦5,000",
      "Change your own password",
    ],
  },
  intern: {
    version: "1.3.0",
    released: "2026-10-26",
    notes: [
      "Redact a participant from a session",
      "Record consent without leaving the session",
      "Change your own password",
      "Give feedback from your profile",
    ],
  },
  annotator: {
    version: "1.3.0",
    released: "2026-10-26",
    notes: [
      "Sign up without waiting for an invitation",
      "Workspace blocks writes while consent is missing, and says so",
      "Change your own password",
      "Give feedback from your profile",
    ],
  },
  admin: {
    version: "1.6.0",
    released: "2026-10-26",
    notes: [
      "Per-person activity on a user, from real figures",
      "Sign-ins and sign-outs in the audit log",
      "Account recovery queue, with real delivery status",
      "Deleting an account shows what goes with it",
      "Feedback from every role, in one table",
    ],
  },
} as const satisfies Record<string, RoleVersion>;

export type VersionedRole = keyof typeof APP_VERSIONS;

export function versionFor(role: string | undefined): RoleVersion | null {
  if (!role) return null;
  return APP_VERSIONS[role as VersionedRole] ?? null;
}
