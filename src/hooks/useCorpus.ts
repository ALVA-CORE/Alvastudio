import { useCallback, useEffect, useState } from "react";
import {
  corpusCoverage,
  corpusSummary,
  type ApiCorpusCoverage,
  type ApiCorpusSummary,
} from "@/lib/api/corpus";
import { reportApiError } from "@/lib/api/reportApiError";
import { round1 } from "@/data/admin/shared";
import type { CorpusSlice, CorpusSnapshot } from "@/data/admin/corpus";

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

/**
 * The corpus, as both admin screens want it.
 *
 * `growth` comes back empty. The summary is a snapshot, not a series, and the
 * only daily numbers the API has are on `/dashboard/admin`, which counts
 * recordings rather than hours. A cumulative hours curve drawn from recording
 * counts would be a different measurement wearing the same label, so the chart
 * that wants it is told there is nothing rather than shown something close.
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
          byAge: [],
          byGender: [],
          growth: [],
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
