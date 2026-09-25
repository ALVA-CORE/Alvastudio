import type { ComponentType } from "react";
import type { IconProps } from "@solar-icons/react/lib/types";
import HomeSmile from "@solar-icons/react/ui/HomeSmile";
import Notebook2 from "@solar-icons/react/school/Notebook2";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import ChartSquare from "@solar-icons/react/business/ChartSquare";
import ClipboardCheck from "@solar-icons/react/notes/ClipboardCheck";
import DocumentText from "@solar-icons/react/notes/DocumentText";
import UsersGroupTwoRounded from "@solar-icons/react/users/UsersGroupTwoRounded";
import Wallet from "@solar-icons/react/money/Wallet";
import Soundwave from "@solar-icons/react/video/Soundwave";
import Settings from "@solar-icons/react/settings/Settings";

export type AdminNavId =
  | "overview"
  | "prompts"
  | "users"
  | "corpus"
  | "reviews"
  | "annotations"
  | "focus-groups"
  | "payments"
  | "audio"
  | "settings";

/**
 * How much of an area the live API can actually serve, carried over verbatim
 * from docs/admin-ui-spec.md. It is on the nav item rather than in the page so
 * the two cannot drift: when an endpoint lands, this table is the one edit.
 */
export type AdminAreaStatus = "ready" | "partial" | "blocked";

export type AdminNavItem = {
  id: AdminNavId;
  path: string;
  /** Rail label. Short enough not to wrap in the expanded rail. */
  label: string;
  /** Page heading — may be longer than the rail label. */
  title: string;
  /** One line on what the area is for. */
  blurb: string;
  status: AdminAreaStatus;
  /** What is still missing, for the areas that are not ready. */
  blockedBy?: string;
  Icon: ComponentType<IconProps>;
};

/**
 * Single source of truth for the admin surface: the rail renders it, the
 * routes are generated from it, and each page reads its own heading out of it.
 * Order follows the spec, with Settings pinned last.
 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: "overview",
    path: "/admin/dashboard",
    label: "Home",
    title: "Overview",
    blurb: "Where the corpus stands and what needs attention today.",
    status: "blocked",
    blockedBy: "GET /dashboard/admin — corpus totals and a growth series",
    Icon: HomeSmile,
  },
  {
    id: "prompts",
    path: "/admin/prompts",
    label: "Prompts",
    title: "Prompts and stimuli",
    blurb:
      "The banks contributors record against. Empty banks mean nobody can record.",
    status: "ready",
    Icon: Notebook2,
  },
  {
    id: "users",
    path: "/admin/users",
    label: "Users",
    title: "User management",
    blurb: "Create staff accounts, change roles, deactivate people who have left.",
    status: "blocked",
    blockedBy: "GET /users, POST /users, PATCH /users/{id}",
    Icon: UsersGroupRounded,
  },
  {
    id: "corpus",
    path: "/admin/corpus",
    label: "Corpus",
    title: "Corpus overview",
    blurb: "Hours collected, coverage by variety and state, and growth over time.",
    status: "blocked",
    blockedBy: "GET /dashboard/admin",
    Icon: ChartSquare,
  },
  {
    id: "reviews",
    path: "/admin/reviews",
    label: "Reviews",
    title: "Review oversight",
    blurb: "Queue depth, rejection reasons and how fast reviewers are clearing work.",
    status: "partial",
    blockedBy: "Per-reviewer throughput stats; reassign or reopen a review",
    Icon: ClipboardCheck,
  },
  {
    id: "annotations",
    path: "/admin/annotations",
    label: "Annotations",
    title: "Annotation oversight",
    blurb: "Which sessions are claimed, by whom, and what is sitting unclaimed.",
    status: "partial",
    blockedBy: "Per-annotator throughput stats",
    Icon: DocumentText,
  },
  {
    id: "focus-groups",
    path: "/admin/focus-groups",
    label: "Focus groups",
    title: "Focus group oversight",
    blurb: "Sessions interns have run, their participants and their audio.",
    status: "ready",
    Icon: UsersGroupTwoRounded,
  },
  {
    id: "payments",
    path: "/admin/payments",
    label: "Payments",
    title: "Payments and rates",
    blurb: "What contributors have earned and what has been paid out.",
    status: "partial",
    blockedBy: "All-contributor earnings, and a CSV export",
    Icon: Wallet,
  },
  {
    id: "audio",
    path: "/admin/audio",
    label: "Audio QC",
    title: "Audio QC tools",
    blurb: "Run analysis, transcription and quality scoring over submitted audio.",
    status: "ready",
    Icon: Soundwave,
  },
  {
    id: "settings",
    path: "/admin/settings",
    label: "Settings",
    title: "Settings",
    blurb: "Your own account.",
    status: "ready",
    Icon: Settings,
  },
];

const BY_ID = new Map(ADMIN_NAV_ITEMS.map((item) => [item.id, item]));

export function adminNavItem(id: AdminNavId): AdminNavItem {
  const item = BY_ID.get(id);
  if (!item) throw new Error(`Unknown admin nav id: ${id}`);
  return item;
}

/**
 * Longest matching path wins, so `/admin/focus-groups` is not shadowed by a
 * shorter prefix and a detail route highlights its parent. Falls back to the
 * overview, which is also where a bare `/admin` lands.
 */
export function getActiveAdminNav(pathname: string): AdminNavId {
  let active: AdminNavId = "overview";
  let longest = 0;

  for (const item of ADMIN_NAV_ITEMS) {
    if (item.id === "overview") continue;
    if (pathname === item.path || pathname.startsWith(`${item.path}/`)) {
      if (item.path.length > longest) {
        longest = item.path.length;
        active = item.id;
      }
    }
  }

  return active;
}
