import { apiFetch } from "./client";

/**
 * Corpus totals and coverage.
 *
 * Hours here are measured server side by decoding each upload, not taken from
 * the `duration_seconds` the browser reported. `unmeasured_rows` counts the
 * ones still falling back to the reported figure, which is worth showing
 * whenever the total goes in front of anyone.
 */

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
