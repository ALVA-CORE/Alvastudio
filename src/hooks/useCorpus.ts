import { useCallback, useEffect, useState } from "react";
import {
  corpusCoverage,
  corpusSummary,
  type ApiCorpusCoverage,
  type ApiCorpusSummary,
  type ApiDailyHours,
  type ApiTypeStatusCell,
} from "@/lib/api/corpus";
import { reportApiError } from "@/lib/api/reportApiError";
import { round1 } from "@/data/admin/shared";
import type { CorpusSlice, CorpusSnapshot, SankeyFlow } from "@/data/admin/corpus";

const VARIETY_LABEL: Record<string, string> = {
  nigerian_pidgin: "Nigerian Pidgin",
  nigerian_english: "Nigerian English",
  pidgin: "Nigerian Pidgin",
  english: "Nigerian English",
};

const TYPE_LABEL: Record<string, string> = {
  prompt_read: "Prompt read",
  stimuli_narration: "Stimuli",
  focus_group: "Focus group",
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  in_review: "In review",
  approved: "Approved",
  rejected: "Rejected",
  flagged: "Flagged",
};

/** Daily hours, run cumulatively, in the shape the growth chart takes. */
function cumulativeHours(daily: ApiDailyHours[]) {
  let running = 0;
  return daily.map((day) => {
    running += day.hours;
    return { date: new Date(day.date), hours: round1(running) };
  });
}

/** `{key: hours}` into the `{label, hours}` every chart on these pages takes. */
function toSlices(
  record: Record<string, number>,
  labels: Record<string, string>
): CorpusSlice[] {
  return Object.entries(record)
    .map(([key, hours]) => ({
      label: labels[key] ?? key.replace(/_/g, " "),
      hours: round1(hours),
    }))
    .filter((slice) => slice.hours > 0)
    .sort((a, b) => b.hours - a.hours);
}

const GENDER_LABEL: Record<string, string> = {
  male: "Male",
  female: "Female",
  unspecified: "Undisclosed",
  other: "Other",
};

/**
 * Collection type through review stage to outcome, as a flow.
 *
 * `by_type_status` is the real joint, so the links are measured rather than
 * inferred from two marginals. Nodes are built from whatever combinations
 * actually appear, so a corpus with no stimuli does not draw an empty stimuli
 * node.
 */
function toFlow(cells: ApiTypeStatusCell[]): SankeyFlow {
  const types = [...new Set(cells.map((cell) => cell.session_type))];
  const statuses = [...new Set(cells.map((cell) => cell.status))];

  const nodes: SankeyFlow["nodes"] = [
    ...types.map((type) => ({
      name: TYPE_LABEL[type] ?? type.replace(/_/g, " "),
      category: "source" as const,
    })),
    ...statuses.map((status) => ({
      name: STATUS_LABEL[status] ?? status.replace(/_/g, " "),
      category: "outcome" as const,
    })),
  ];

  const links = cells
    .filter((cell) => cell.hours > 0)
    .map((cell) => ({
      source: types.indexOf(cell.session_type),
      target: types.length + statuses.indexOf(cell.status),
      value: round1(cell.hours),
    }));

  return links.length > 0 ? { nodes, links } : { nodes: [], links: [] };
}

/**
 * The corpus, as both admin screens want it.
 *
 * Everything on it is measured now, including the growth curve and the flow.
 * `growth` runs `daily_hours` cumulatively, which is hours rather than the
 * clip counts `/dashboard/admin` reports, so the two charts no longer measure
 * different things under the same label.
 */
export function useCorpus() {
  const [data, setData] = useState<CorpusSnapshot | null>(null);
  const [coverage, setCoverage] = useState<ApiCorpusCoverage | null>(null);
  const [raw, setRaw] = useState<ApiCorpusSummary | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([corpusSummary(), corpusCoverage()])
      .then(([summary, states]) => {
        if (cancelled) return;

        setRaw(summary);
        setCoverage(states);
        setData({
          totalHours: round1(summary.total_hours),
          approvedHours: round1(summary.approved_hours),
          contributors: summary.contributors,
          sessions: summary.focus_group_sessions,
          byVariety: toSlices(summary.by_language_variety, VARIETY_LABEL),
          byStatus: toSlices(summary.by_status, STATUS_LABEL),
          byType: toSlices(summary.by_session_type, TYPE_LABEL),
          byState: states.states
            .filter((row) => row.hours > 0)
            .map((row) => ({ label: row.state, hours: round1(row.hours) }))
            .sort((a, b) => b.hours - a.hours),
          /* No endpoint carries hours split by speaker demographics. The
             intern dashboard has its own by-gender and by-age figures, but
             those are that intern's sessions, not the corpus. */
          byAge: summary.demographics.by_age_bracket
            .map((slice) => ({ label: slice.value, hours: round1(slice.hours) }))
            .filter((slice) => slice.hours > 0),
          byGender: summary.demographics.by_gender
            .map((slice) => ({
              label: GENDER_LABEL[slice.value] ?? slice.value,
              hours: round1(slice.hours),
            }))
            .filter((slice) => slice.hours > 0),
          growth: cumulativeHours(summary.daily_hours),
          flow: toFlow(summary.by_type_status),
        });
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load the corpus."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return {
    data,
    coverage,
    raw,
    isLoading,
    error,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
  };
}
