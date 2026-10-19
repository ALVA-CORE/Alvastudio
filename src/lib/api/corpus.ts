import { apiFetch } from "./client";

/**
 * Corpus totals and coverage.
 *
 * Hours are measured server side by decoding each upload, not taken from the
 * `duration_seconds` the browser reported. `unmeasured_rows` counts the ones
 * still falling back to the reported figure, which is worth showing whenever
 * the total goes in front of anyone.
 *
 * The three `by_*` maps count different populations and it matters:
 * `by_session_type` and `by_status` are clips only, `by_language_variety` is
 * clips *and* focus-group sessions. A corpus with sessions but no clips has
 * the first two empty and the third populated, which looks like a bug and is
 * not.
 */

export type ApiDailyHours = { date: string; hours: number };

/** The real joint, so it sums back to both marginals a sankey needs. */
export type ApiTypeStatusCell = {
  session_type: string;
  status: string;
  clips: number;
  hours: number;
};

export type ApiDemographicSlice = {
  value: string;
  speakers: number;
  hours: number;
};

export type ApiCorpusSummary = {
  total_hours: number;
  recording_hours: number;
  focus_group_hours: number;
  clips: number;
  focus_group_sessions: number;
  contributors: number;
  focus_group_participants: number;
  by_session_type: Record<string, number>;
  by_language_variety: Record<string, number>;
  by_status: Record<string, number>;
  approved_hours: number;
  unmeasured_rows: number;
  /** 365 zero-filled daily buckets, measured hours. */
  daily_hours: ApiDailyHours[];
  hours_in_window: number;
  by_type_status: ApiTypeStatusCell[];
  /**
   * Contributors' recordings only.
   *
   * A focus group has several speakers and one audio file, so splitting its
   * hours by gender would mean inventing a number. Session participants are
   * still counted under `speakers`.
   */
  demographics: {
    by_gender: ApiDemographicSlice[];
    by_age_bracket: ApiDemographicSlice[];
  };
};

export type ApiStateCoverage = {
  state: string;
  speakers: number;
  hours: number;
};

/**
 * All 37 states including the empty ones, plus `unknown`.
 *
 * The gaps are the point of the map, so a state with nothing in it still comes
 * back. `unmatched_states` lists anything that matched no state verbatim, so a
 * typo can be fixed at source rather than quietly disappearing into `unknown`.
 */
export type ApiCorpusCoverage = {
  states: ApiStateCoverage[];
  unmatched_states: Record<string, number>;
};

export const corpusSummary = () => apiFetch<ApiCorpusSummary>("/corpus/summary");
export const corpusCoverage = () => apiFetch<ApiCorpusCoverage>("/corpus/coverage");
