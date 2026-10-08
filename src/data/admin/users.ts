import type { HeatmapColumn } from "@/components/charts/heatmap";
import { NIGERIAN_NAMES, daysAgo, relativeDays, round1, seeded } from "./shared";

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
   * Interns only. They apply rather than being invited, so the account exists
   * before anyone has agreed to it and cannot be signed into until an admin
   * says so. Every other role is either self-serve (contributor) or created by
   * an admin, which is the approval.
   */
  approval?: "pending" | "approved";
};

export type AccountStatus = "pending" | "active" | "deactivated";

/** One status, so the table, the panel and the filter cannot disagree. */
export function accountStatus(user: AdminUser): AccountStatus {
  if (user.role === "intern" && user.approval === "pending") return "pending";
  return user.isActive ? "active" : "deactivated";
}

export const STATUS_LABEL: Record<AccountStatus, string> = {
  pending: "Pending approval",
  active: "Active",
  deactivated: "Deactivated",
};

/**
 * Who an admin can send a reset link to.
 *
 * Staff accounts only. Contributors and interns authenticate through the
 * signup flow they came in on, and there is no admin-triggered reset for them
 * to call, so the button was a toast with nothing behind it.
 */
export function canResetPassword(user: AdminUser) {
  return user.role === "annotator" || user.role === "admin";
}

export const ROLE_LABELS: Record<AdminUserRole, string> = {
  contributor: "Contributor",
  intern: "Intern",
  annotator: "Annotator",
  admin: "Admin",
};

const OUTPUT_LABEL: Record<AdminUserRole, string> = {
  contributor: "recordings",
  intern: "sessions",
  annotator: "annotations",
  admin: ", ",
};

/* Weighted: a speech corpus is mostly contributors, with a thin staff layer. */
const ROLE_MIX: AdminUserRole[] = [
  ...Array<AdminUserRole>(11).fill("contributor"),
  ...Array<AdminUserRole>(4).fill("intern"),
  ...Array<AdminUserRole>(4).fill("annotator"),
  "admin",
];

function buildUsers(): AdminUser[] {
  const random = seeded(7717);

  return ROLE_MIX.map((role, index) => {
    const fullName = NIGERIAN_NAMES[index % NIGERIAN_NAMES.length];
    const created = daysAgo(Math.floor(random() * 240) + 3);
    const handle = fullName.toLowerCase().replace(/\s+/g, ".");

    return {
      id: `u-${String(index + 1).padStart(3, "0")}`,
      fullName,
      email: `${handle}@alvacoreai.com`,
      phone: `080${Math.floor(random() * 90000000 + 10000000)}`,
      role,
      // A handful of leavers, so the filter has something to hide.
      isActive: role === "intern" && index % 2 === 0 ? false : random() > 0.12,
      // Half the interns are still waiting on an admin, so the queue is
      // visible the moment the page opens.
      approval: (role === "intern"
        ? index % 2 === 0
          ? "pending"
          : "approved"
        : undefined) as AdminUser["approval"],
      createdAt: created.getTime(),
      joinedLabel: relativeDays(created),
      output:
        role === "admin"
          ? 0
          : Math.floor(random() * (role === "contributor" ? 180 : 40)) + 1,
      outputLabel: OUTPUT_LABEL[role],
    };
  })
    /* Applications first. They are the only rows on this page that are
     * waiting on the person reading it; everything else is a record. */
    .sort((a, b) => {
      const waiting = Number(accountStatus(b) === "pending") -
        Number(accountStatus(a) === "pending");
      return waiting !== 0 ? waiting : b.createdAt - a.createdAt;
    });
}

export const ADMIN_USERS: AdminUser[] = buildUsers();

export function userMetrics(rows: AdminUser[]) {
  const active = rows.filter((row) => row.isActive);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return {
    total: String(rows.length),
    active: String(active.length),
    staff: String(
      active.filter((row) => row.role !== "contributor").length
    ),
    joinedThisWeek: String(rows.filter((row) => row.createdAt >= weekAgo).length),
    pending: String(
      rows.filter((row) => accountStatus(row) === "pending").length
    ),
  };
}

export const EMPTY_USER_METRICS = {
  total: "0",
  active: "0",
  staff: "0",
  joinedThisWeek: "0",
  pending: "0",
};

/** Mirrors the ids the mock table uses, so a picked row can be found again. */
export function findUser(id: string) {
  return ADMIN_USERS.find((row) => row.id === id) ?? null;
}
/* ------------------------------------------------------------------ *
 * Detail panel data
 * ------------------------------------------------------------------ */

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
export function userActivity(user: AdminUser): HeatmapColumn[] {
  let hash = 0;
  for (let i = 0; i < user.id.length; i += 1) {
    hash = (hash * 31 + user.id.charCodeAt(i)) % 100000;
  }
  const random = seeded(hash + 1);

  const weeks = 53;
  const start = daysAgo(weeks * 7 - 1);
  start.setDate(start.getDate() - start.getDay());
  const today = new Date();
  const joined = new Date(user.createdAt);

  return Array.from({ length: weeks }, (_, week) => ({
    bin: week,
    bins: Array.from({ length: 7 }, (_, day) => {
      const date = new Date(start);
      date.setDate(start.getDate() + week * 7 + day);

      // Nothing before they joined, nothing after today, and Sundays are quiet.
      const inRange = date >= joined && date <= today;
      const damping = day === 0 ? 0.1 : day === 6 ? 0.4 : 1;
      const raw = random() * 7 * damping * (user.isActive ? 1 : 0.25);

      return { bin: day, count: inRange ? Math.round(raw) : 0, date };
    }),
  }));
}

/** Headline numbers for the panel's activity tab, read off the same series. */
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

const ADMIN_ACTIONS = [
  "Role changed",
  "Password reset sent",
  "Account reactivated",
  "Deactivated",
];

export function userAuditLog(user: AdminUser): AuditEvent[] {
  let hash = 0;
  for (let i = 0; i < user.id.length; i += 1) {
    hash = (hash * 17 + user.id.charCodeAt(i)) % 100000;
  }
  const random = seeded(hash + 99);

  const events: AuditEvent[] = [
    { id: "joined", label: "Joined Alvastudio", at: new Date(user.createdAt) },
  ];

  if (user.output > 0) {
    events.push({
      id: "first-output",
      label: `First ${user.outputLabel.replace(/s$/, "")} submitted`,
      at: daysAgo(Math.floor(random() * 120) + 2),
    });
  }

  const adminActions = Math.floor(random() * 3);
  for (let i = 0; i < adminActions; i += 1) {
    events.push({
      id: `admin-${i}`,
      label: ADMIN_ACTIONS[Math.floor(random() * ADMIN_ACTIONS.length)],
      at: daysAgo(Math.floor(random() * 60) + 1),
      byAdmin: true,
    });
  }

  if (!user.isActive) {
    events.push({
      id: "deactivated",
      label: "Account deactivated",
      at: daysAgo(Math.floor(random() * 20) + 1),
      byAdmin: true,
    });
  }

  // Newest first — an audit trail is read from what just happened.
  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
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

const HOURS = (seed: () => number, max: number) => `${round1(seed() * max)}h`;

export function roleStats(user: AdminUser): RoleStat[] {
  let hash = 0;
  for (let i = 0; i < user.id.length; i += 1) {
    hash = (hash * 31 + user.id.charCodeAt(i)) % 100000;
  }
  const random = seeded(hash + 5);
  const output = user.output;

  if (user.role === "contributor") {
    const approved = Math.round(output * (0.62 + random() * 0.3));
    const rejected = Math.round((output - approved) * (0.3 + random() * 0.5));
    return [
      { label: "Recordings", value: String(output) },
      { label: "Approved", value: String(approved), tone: "accent" },
      { label: "Rejected", value: String(rejected), tone: rejected > 0 ? "danger" : undefined },
      { label: "Awaiting review", value: String(Math.max(output - approved - rejected, 0)) },
      { label: "Hours contributed", value: HOURS(random, 6) },
      { label: "Prompts read", value: String(Math.round(output * 0.8)) },
      { label: "Points", value: String(output * 12) },
      { label: "Earned", value: `₦${(output * 150).toLocaleString()}` },
    ];
  }

  if (user.role === "intern") {
    const withAudio = Math.round(output * (0.7 + random() * 0.28));
    return [
      { label: "Sessions run", value: String(output) },
      { label: "Audio uploaded", value: String(withAudio), tone: "accent" },
      {
        label: "Missing audio",
        value: String(output - withAudio),
        tone: output - withAudio > 0 ? "danger" : undefined,
      },
      { label: "Participants logged", value: String(Math.round(output * 3.4)) },
      { label: "Hours recorded", value: HOURS(random, 40) },
      { label: "Clips reviewed", value: String(Math.round(output * 2.1)) },
      { label: "States covered", value: String(Math.min(Math.ceil(output / 4), 12)) },
      { label: "Avg session", value: `${Math.round(18 + random() * 22)}m` },
    ];
  }

  if (user.role === "annotator") {
    const segments = Math.round(output * (90 + random() * 120));
    return [
      { label: "Annotations", value: String(output) },
      { label: "Approved", value: String(Math.round(output * 0.78)), tone: "accent" },
      {
        label: "Needs rework",
        value: String(Math.round(output * 0.09)),
        tone: "danger",
      },
      { label: "Segments created", value: segments.toLocaleString() },
      { label: "Tags applied", value: Math.round(segments * 0.6).toLocaleString() },
      { label: "Hours annotated", value: HOURS(random, 60) },
      { label: "Segments per hour", value: String(Math.round(40 + random() * 45)) },
      { label: "Currently claimed", value: String(Math.round(random() * 3)) },
    ];
  }

  return [
    { label: "Areas granted", value: String(user.permissions?.length ?? "All") },
    { label: "Accounts created", value: String(Math.round(random() * 14)) },
    { label: "Rates changed", value: String(Math.round(random() * 6)) },
    { label: "Prompts added", value: String(Math.round(random() * 60)) },
  ];
}

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
