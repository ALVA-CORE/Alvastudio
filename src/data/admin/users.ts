import type { HeatmapColumn } from "@/components/charts/heatmap";
import { round1 } from "./shared";

export type AdminUserRole = "contributor" | "intern" | "annotator" | "admin";

/**
 * Roles an admin can create.
 *
 * Contributor is absent on purpose: contributors sign themselves up, and a
 * hand-made one would have no consent record and no onboarding profile. The
 * rest cannot self-register, which is the whole reason this screen exists.
 */
export const CREATABLE_ROLES: AdminUserRole[] = ["intern", "annotator", "admin"];

/**
 * Which admin areas an account may open.
 *
 * Only meaningful for `admin`. Every other role's reach is fixed by the role
 * itself, so the picker is hidden for them rather than shown and ignored.
 */
export type AdminPermission =
  | "prompts"
  | "users"
  | "corpus"
  | "reviews"
  | "annotations"
  | "focus-groups"
  | "payments"
  | "audio";

export const ADMIN_PERMISSIONS: Array<{
  id: AdminPermission;
  label: string;
  detail: string;
}> = [
  { id: "prompts", label: "Prompts and stimuli", detail: "Add, edit and retire bank items" },
  { id: "users", label: "Users", detail: "Create accounts and change roles" },
  { id: "corpus", label: "Corpus", detail: "Read-only totals and coverage" },
  { id: "reviews", label: "Reviews", detail: "Every recording and its verdict" },
  { id: "annotations", label: "Annotations", detail: "Every annotation and its status" },
  { id: "focus-groups", label: "Focus groups", detail: "Sessions across all interns" },
  { id: "payments", label: "Payments", detail: "Rates, earnings and payment runs" },
  { id: "audio", label: "Audio QC", detail: "Run the ML scoring tools" },
];

/** What a new admin gets unless the creator says otherwise. */
export const DEFAULT_ADMIN_PERMISSIONS: AdminPermission[] = [
  "prompts",
  "corpus",
  "reviews",
  "annotations",
  "focus-groups",
];

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: AdminUserRole;
  isActive: boolean;
  createdAt: number;
  joinedLabel: string;
  /** Role-appropriate headline number — recordings, sessions or annotations. */
  output: number;
  outputLabel: string;
  /** Admins only — which areas they can open. */
  permissions?: AdminPermission[];
  /**
   * Interns and annotators. Both apply rather than being invited, so the
   * account exists before anyone has agreed to it and cannot be used until an
   * admin says so. Contributors are self-serve, and an admin-created account
   * is approved by the act of creating it.
   */
  approval?: "pending" | "approved";
};

export type AccountStatus = "pending" | "active" | "deactivated";

/** One status, so the table, the panel and the filter cannot disagree. */
export function accountStatus(user: AdminUser): AccountStatus {
  if (user.approval === "pending") return "pending";
  return user.isActive ? "active" : "deactivated";
}

export const STATUS_LABEL: Record<AccountStatus, string> = {
  pending: "Pending approval",
  active: "Active",
  deactivated: "Deactivated",
};

/**
 * Who an admin can issue a reset token for. Everybody.
 *
 * It used to be staff only, on the belief that there was no admin-triggered
 * reset for a contributor or an intern. There is: `POST /users/{id}/password-reset`
 * takes any account and returns a single-use token.
 *
 * Hiding it was worst for exactly the people who needed it most. A
 * contributor locked out has no other way in while recovery emails are being
 * refused, and a deactivated account cannot ask for one at all.
 */
export function canResetPassword(_user: AdminUser) {
  return true;
}

/**
 * Whose details an admin may change.
 *
 * Staff accounts only. A contributor's and an intern's profile is theirs: they
 * filled it in at signup, it carries their consent record, and an admin
 * editing it silently changes what a person agreed to. Annotators and admins
 * are accounts this screen created in the first place, so this screen owns
 * them.
 *
 * Deactivating and deleting are not edits and stay available for every role.
 */
export function canEditProfile(user: AdminUser) {
  return user.role === "annotator" || user.role === "admin";
}

/** Plain text, no pill. The colour is the status. */
export const STATUS_TINT: Record<AccountStatus, string> = {
  active: "text-alva-accent",
  pending: "text-amber-300",
  deactivated: "text-red-400",
};

export const ROLE_LABELS: Record<AdminUserRole, string> = {
  contributor: "Contributor",
  intern: "Intern",
  annotator: "Annotator",
  admin: "Admin",
};



/** Headline counts for the users page, read off the rows it already has. */
export function userMetrics(rows: AdminUser[]) {
  const active = rows.filter((row) => row.isActive);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return {
    total: String(rows.length),
    active: String(active.length),
    staff: String(active.filter((row) => row.role !== "contributor").length),
    joinedThisWeek: String(rows.filter((row) => row.createdAt >= weekAgo).length),
    pending: String(rows.filter((row) => accountStatus(row) === "pending").length),
  };
}

export const EMPTY_USER_METRICS = {
  total: "0",
  active: "0",
  staff: "0",
  joinedThisWeek: "0",
  pending: "0",
};

export type AuditEvent = {
  id: string;
  label: string;
  at: Date;
  /** Marks the events an admin caused, so they read apart from the user's own. */
  byAdmin?: boolean;
};

/**
 * A year of daily activity, calendar-shaped.
 *
 * Seeded off the user id so the same person shows the same history every time
 * the panel opens — a heatmap that reshuffles on reopen looks like a bug.
 */
export function activitySummary(columns: HeatmapColumn[]) {
  const days = columns
    .flatMap((column) => column.bins)
    .filter((bin) => bin.date instanceof Date && (bin.date as Date) <= new Date());

  const total = days.reduce((sum, bin) => sum + (bin.count ?? 0), 0);
  const activeDays = days.filter((bin) => (bin.count ?? 0) > 0).length;

  /* Longest run of consecutive days with something on them. */
  let streak = 0;
  let best = 0;
  for (const bin of days) {
    streak = (bin.count ?? 0) > 0 ? streak + 1 : 0;
    if (streak > best) best = streak;
  }

  return {
    total,
    activeDays,
    bestStreak: best,
    perActiveDay: activeDays > 0 ? round1(total / activeDays) : 0,
  };
}

export function formatAuditTimestamp(date: Date) {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}



/* ------------------------------------------------------------------ *
 * Role-specific detail
 * ------------------------------------------------------------------ */

/**
 * What an admin sees about one person, by role.
 *
 * A contributor, an intern and an annotator do completely different jobs, so
 * "17 sessions" against a shared label tells an admin almost nothing. These
 * are the figures each role already sees on their own dashboard — the admin
 * should be looking at the same numbers the person is, not a flattened
 * summary of them.
 */
export type RoleStat = { label: string; value: string; tone?: "accent" | "danger" };



/** What the activity tab's headline reads as, per role. */
export function activityNoun(user: AdminUser) {
  return user.role === "contributor"
    ? "recordings"
    : user.role === "intern"
      ? "sessions"
      : user.role === "annotator"
        ? "segments"
        : "actions";
}
