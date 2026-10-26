import { CORPUS, CORPUS_FLOW, type CorpusSnapshot } from "@/data/admin/corpus";
import { ADMIN_ANNOTATIONS, ADMIN_RECORDINGS } from "@/data/admin/oversight";
import { daysAgo, seeded } from "@/data/admin/shared";
import type { ApiAdminDashboard } from "@/lib/api/adminDashboard";
import type { ApiCorpusCoverage } from "@/lib/api/corpus";
import type { ApiFeedback } from "@/lib/api/feedback";

/**
 * The admin surface, filled in.
 *
 * Demo mode draws every admin chart from here instead of the API, so the
 * screens can be recorded without a backend holding a year of corpus. It is
 * reached by setting `alva-dev-ui-state` to `demo`; nothing here is ever
 * served in normal use.
 *
 * These build on the seeded datasets the pages already fall back to, rather
 * than inventing a second set that would drift away from them.
 */

/** The flow is empty on the base snapshot; a recording wants it drawn. */
export const DEMO_CORPUS: CorpusSnapshot = { ...CORPUS, flow: CORPUS_FLOW };

/**
 * `YYYY-MM-DD` as a LOCAL calendar day.
 *
 * Not `toISOString().slice(0, 10)`, which is UTC: in Lagos that lands on the
 * previous day for anything before 01:00, and the readers of these series
 * parse them back as local days.
 */
function isoDay(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * A year of daily uploads, with a weekly rhythm.
 *
 * Deterministic, so a chart looks the same across takes of a recording, and
 * weekends are quieter because a flat curve reads as a generated one.
 */
function dailyActivity(days = 365) {
  const random = seeded(20_26);

  return Array.from({ length: days }, (_, index) => {
    const date = daysAgo(days - 1 - index);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const base = weekend ? 4 : 14;

    return {
      date: isoDay(date),
      count: Math.max(0, Math.round(base + random() * 11 - 3)),
    };
  });
}

const DEMO_DAILY = dailyActivity();

export const DEMO_ADMIN_DASHBOARD: ApiAdminDashboard = {
  users_by_role: { contributor: 212, intern: 10, annotator: 6, admin: 3 },
  total_recordings: ADMIN_RECORDINGS.length * 37,
  total_focus_group_sessions: 142,
  total_annotations: ADMIN_ANNOTATIONS.length * 4,
  recording_status: {
    submitted: 184,
    in_review: 96,
    approved: 1_942,
    rejected: 118,
    flagged: 37,
  },
  annotation_status: {
    draft: 22,
    in_progress: 14,
    submitted: 31,
    approved: 78,
    needs_rework: 9,
    rejected: 4,
  },
  /* Something stuck in each lane: the overview exists to answer "what is
   * blocked", and all-zeroes records as a screen with nothing to say. */
  stuck_unreviewed_recordings: {
    count: 23,
    oldest_at: daysAgo(6).toISOString(),
    oldest_age_days: 6,
  },
  stuck_unclaimed_sessions: {
    count: 7,
    oldest_at: daysAgo(4).toISOString(),
    oldest_age_days: 4,
  },
  stuck_annotations_in_rework: {
    count: 5,
    oldest_at: daysAgo(9).toISOString(),
    oldest_age_days: 9,
  },
  activity_window_days: 365,
  daily_activity: DEMO_DAILY,
  recordings_in_window: DEMO_DAILY.reduce((total, day) => total + day.count, 0),
};

/**
 * Coverage, plus a few entries that matched no state.
 *
 * The unmatched list is empty on a healthy corpus, which makes it the one card
 * that records better with something wrong in it: misspellings are what it is
 * for, so it shows them.
 */
export const DEMO_CORPUS_COVERAGE: ApiCorpusCoverage = {
  states: CORPUS.byState.map((slice) => ({
    state: slice.label,
    speakers: Math.max(1, Math.round(slice.hours * 2.4)),
    hours: slice.hours,
  })),
  unmatched_states: {
    "Lagos state": 6,
    Abuja: 4,
    "portharcourt": 3,
    "Oyo ": 2,
    "": 1,
  },
};

/* ------------------------------------------------------------------ *
 * Feedback
 * ------------------------------------------------------------------ */

/**
 * What people have written in, for a recording.
 *
 * Deliberately a mix: a real bug with a step somebody can follow, a note
 * that is mostly a feeling, a complaint about something that works as
 * designed, and one from a signed-out person with no name on it. A table of
 * five polite suggestions would show the component and hide the job.
 *
 * Every one carries a rating, because the form will not send without one.
 * They spread across the scale on purpose: a demo where everybody picked four
 * says nothing about what the column is for.
 */
function hoursAgo(n: number) {
  return new Date(Date.now() - n * 36e5).toISOString();
}

export const DEMO_FEEDBACK: ApiFeedback[] = [
  {
    id: "fb-1",
    user_id: "u-204",
    full_name: "Chidinma Okafor",
    email: "chidinma.okafor@example.com",
    role: "contributor",
    kind: "bug",
    rating: 2,
    message:
      "The record button does nothing after I pause and come back. I have to close the whole app and open it again, and the clip I was on is gone. Happened three times today on Chrome.",
    page: "/contributor/studio",
    status: "new",
    created_at: hoursAgo(3),
  },
  {
    id: "fb-2",
    user_id: "u-117",
    full_name: "Emeka Nwosu",
    email: "emeka.nwosu@example.com",
    role: "intern",
    kind: "confusing",
    rating: 3,
    message:
      "I never know whether a participant's consent went through. The sheet closes and nothing says it saved. I end up recording it twice to be sure.",
    page: "/intern/participants",
    status: "reading",
    created_at: hoursAgo(9),
  },
  {
    id: "fb-3",
    user_id: "u-331",
    full_name: "Aisha Bello",
    email: "aisha.bello@example.com",
    role: "annotator",
    kind: "idea",
    rating: 4,
    message:
      "Could the timeline remember my zoom level between sessions? I set it the same way every time I open one.",
    page: "/annotator/sessions",
    status: "new",
    created_at: hoursAgo(26),
  },
  {
    id: "fb-4",
    user_id: null,
    full_name: null,
    email: null,
    role: null,
    kind: "bug",
    rating: 1,
    message:
      "Asked for a password reset two days ago and no email came. Checked spam. Cannot get into my account at all.",
    page: "/forgot-password",
    status: "done",
    created_at: hoursAgo(50),
  },
  {
    id: "fb-5",
    user_id: "u-188",
    full_name: "Tunde Adeyemi",
    email: "tunde.adeyemi@example.com",
    role: "contributor",
    kind: "praise",
    rating: 5,
    message:
      "The milestone bar is the first thing that made the points feel like money. Knowing how far off the next ₦5,000 is keeps me going.",
    page: "/contributor/dashboard",
    status: "new",
    created_at: hoursAgo(71),
  },
  {
    id: "fb-6",
    user_id: "u-245",
    full_name: "Ngozi Eze",
    email: "ngozi.eze@example.com",
    role: "contributor",
    kind: "other",
    rating: 2,
    message:
      "Why can I not change my own phone number? I had to ask an admin for something that takes one second.",
    page: "/contributor/profile",
    status: "wont_fix",
    created_at: hoursAgo(96),
  },
];
