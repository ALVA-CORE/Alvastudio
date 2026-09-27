import type { HeatmapColumn } from "@/components/charts/heatmap";
import { NIGERIAN_NAMES, daysAgo, relativeDays, round1, seeded } from "./shared";

export type AdminUserRole = "contributor" | "intern" | "annotator" | "admin";

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
};

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
  admin: "—",
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
      isActive: random() > 0.12,
      createdAt: created.getTime(),
      joinedLabel: relativeDays(created),
      output:
        role === "admin"
          ? 0
          : Math.floor(random() * (role === "contributor" ? 180 : 40)) + 1,
      outputLabel: OUTPUT_LABEL[role],
    };
  }).sort((a, b) => b.createdAt - a.createdAt);
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
  };
}

export const EMPTY_USER_METRICS = {
  total: "0",
  active: "0",
  staff: "0",
  joinedThisWeek: "0",
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

