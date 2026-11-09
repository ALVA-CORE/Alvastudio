import { useCallback, useEffect, useRef, useState } from "react";
import {
  assignReviewer,
  listRecordingsPage,
  recordingsSummary,
  type ApiRecording,
  type ApiRecordingSort,
  type ApiRecordingSummary,
  type ApiRecordingVerdict,
} from "@/lib/api/recordings";
import type { ApiRecordingStatus } from "@/lib/api/enums";
import { reportApiError } from "@/lib/api/reportApiError";
import {
  REJECTION_REASON_LABEL,
  RUBRIC_QUESTIONS,
  type AdminRecording,
  type RecordingStatus,
  type RubricAnswer,
  type RubricEntry,
} from "@/data/admin/oversight";
import { formatDuration, relativeDays } from "@/data/admin/shared";

const VARIETY: Record<string, "Nigerian English" | "Nigerian Pidgin"> = {
  nigerian_english: "Nigerian English",
  nigerian_pidgin: "Nigerian Pidgin",
};

const MODE: Record<string, AdminRecording["mode"]> = {
  prompt_read: "Prompt read",
  stimuli_narration: "Stimuli",
  focus_group: "Focus group",
};

export type ReviewsView = {
  /** Omitted for every status. */
  status?: ApiRecordingStatus;
  /** Blank for no search. */
  q: string;
  /** Omitted for the server's default, newest first. */
  sort?: { key: ApiRecordingSort; order: "asc" | "desc" };
  /** 1-based. */
  page: number;
  pageSize: number;
};

/**
 * The admin reviews screen: one page of clips, and the counts over all of them.
 *
 * The table is a page of `GET /recordings`, searched, sorted and filtered on
 * the server, each row carrying its verdicts (`expand=verdicts`, newest
 * first). The cards and charts are `GET /recordings/summary`, over every
 * recording whatever the table shows. It used to download every clip, every
 * verdict and every user and work all of it out here, which kept the oldest
 * verdict where it wanted the newest and lost rows to uploads mid-load.
 */
export function useAdminReviews(view: ReviewsView) {
  const { status, q, sort, page, pageSize } = view;
  const [rows, setRows] = useState<AdminRecording[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<ApiRecordingSummary | null>(null);
  /* The page skeleton until both first answers are in; after that only the
     table waits. */
  const [isLoading, setLoading] = useState(true);
  const [isFetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loadedOnce = useRef(false);

  const sortKey = sort?.key;
  const sortOrder = sort?.order;

  useEffect(() => {
    /* A page, search or sort that is replaced is aborted, so a slow old
       answer cannot land on top of the new one. */
    const controller = new AbortController();
    const cancelled = () => controller.signal.aborted;
    setFetching(true);

    Promise.all([
      listRecordingsPage(
        {
          limit: pageSize,
          offset: (page - 1) * pageSize,
          expand: "verdicts",
          ...(status ? { status } : {}),
          ...(q ? { q } : {}),
          ...(sortKey ? { sort: sortKey, order: sortOrder } : {}),
        },
        controller.signal
      ),
      /* Counts move only with verdicts and uploads, not with the table's
         filters, so they are read with the first page and on reload. */
      loadedOnce.current ? Promise.resolve(null) : recordingsSummary(controller.signal),
    ])
      .then(([pageResult, nextSummary]) => {
        if (cancelled()) return;
        setRows(pageResult.items.map(toAdminRecording));
        setTotal(pageResult.total);
        if (nextSummary) setSummary(nextSummary);
        loadedOnce.current = true;
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled()) setError(reportApiError(cause, "Could not load recordings."));
      })
      .finally(() => {
        if (cancelled()) return;
        setLoading(false);
        setFetching(false);
      });

    return () => controller.abort();
  }, [status, q, sortKey, sortOrder, page, pageSize, attempt]);

  /** The page and the counts again, as after a reassign or a reopen. */
  const reload = useCallback(() => {
    loadedOnce.current = false;
    setAttempt((value) => value + 1);
  }, []);

  const reassign = useCallback(
    async (recordingId: string, reviewerId: string | null) => {
      await assignReviewer(recordingId, reviewerId);
      reload();
    },
    [reload]
  );

  return { rows, total, summary, isLoading, isFetching, error, reload, reassign };
}

/** The four answers, in the order the rubric asks them. */
function toRubric(verdict: ApiRecordingVerdict): RubricEntry[] {
  const answers: Record<string, RubricAnswer> = {
    noiseFree: verdict.q_noise_free,
    audible: verdict.q_clear_audible,
    matchesPrompt: verdict.q_matches_prompt,
    natural: verdict.q_natural_intelligible,
  };

  return RUBRIC_QUESTIONS.map((question) => ({
    ...question,
    answer: answers[question.id],
  }));
}

function toAdminRecording(api: ApiRecording): AdminRecording {
  const submitted = new Date(api.created_at);
  /* Newest first: the verdict the status reflects. */
  const latest = api.verdicts?.[0];
  /* Measured from the stored file where we have it; the browser's figure
     was never checked. */
  const durationSec = Math.round(api.measured_duration_seconds ?? api.duration_seconds ?? 0);

  return {
    id: api.id,
    /* The first eight characters of the id: stable, unlike a position in a
       list that every upload renumbers, and what `q` matches. */
    code: api.id.slice(0, 8),
    contributor: api.contributor_name ?? "Unknown",
    mode: MODE[api.session_type] ?? "Prompt read",
    prompt: api.prompt_text ?? api.stimulus_text ?? "",
    durationSec,
    duration: formatDuration(durationSec),
    /* The variety of the prompt or stimulus the clip was read from, not the
     * contributor's profile preference — that one can be `both`, so it cannot
     * label a single clip. */
    variety: VARIETY[api.language_variety ?? ""] ?? "Nigerian English",
    status: api.status as RecordingStatus,
    reviewer: api.reviewer_name ?? (api.assigned_reviewer_id ? "Assigned" : ""),
    submittedAt: submitted.getTime(),
    reviewedAt: api.reviewed_at ? new Date(api.reviewed_at).getTime() : 0,
    submittedLabel: relativeDays(submitted),
    rejectionReason: latest?.rejection_reason
      ? REJECTION_REASON_LABEL[latest.rejection_reason]
      : undefined,
    /* The reviewer's real answers, or nothing. Null is not "all yes": it is
       "nobody has judged this", and the panel says so. */
    rubric: latest ? toRubric(latest) : null,
    reviewNotes: latest?.notes ?? null,
    audioUrl: "",
  };
}
