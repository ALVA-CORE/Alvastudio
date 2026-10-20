import { CORPUS, CORPUS_FLOW, type CorpusSnapshot } from "@/data/admin/corpus";
import { ADMIN_ANNOTATIONS, ADMIN_RECORDINGS } from "@/data/admin/oversight";
import { daysAgo, seeded } from "@/data/admin/shared";
import type { ApiAdminDashboard } from "@/lib/api/adminDashboard";
import type { ApiCorpusCoverage } from "@/lib/api/corpus";

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
