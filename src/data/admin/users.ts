import { NIGERIAN_NAMES, daysAgo, relativeDays, seeded } from "./shared";

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