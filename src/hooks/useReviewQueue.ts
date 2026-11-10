import { useCallback, useEffect, useState } from "react";
import * as reviewsApi from "@/lib/api/reviews";
import {
  listRecordingsPage,
  type ApiRecording,
  type ApiRecordingSort,
} from "@/lib/api/recordings";
import { useAuth } from "@/lib/auth/context";
import { reportApiError } from "@/lib/api/reportApiError";
import type { ReviewQueueItem } from "@/data/reviewQueue";
import { NO_VALUE } from "@/lib/no-value";
import { formatDuration } from "@/lib/duration";

/**
 * An intern's review work, as three small requests (9 Nov):
 *
 * - their desk, `/reviews/queue?mine`: at most 20 clips, refilled from the
 *   bank by every verdict;
 * - how many clips wait in the bank for a desk, as a number;
 * - their history, `/recordings?judged_by=` themselves, a page at a time and
 *   only when they open it (`useReviewHistory`).
 *
 * It used to read every recording they could see, every contributor and
 * every verdict of theirs, one page after another, and work out the rest
 * here.
 */

function relative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return NO_VALUE;
  const hours = Math.floor((Date.now() - then) / 36e5);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : days < 7 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;
}

const VARIETY: Record<string, string> = {
  nigerian_english: "Nigerian English",
  nigerian_pidgin: "Nigerian Pidgin",
};

const MODE: Record<string, ReviewQueueItem["mode"]> = {
  prompt_read: "Prompt reader",
  stimuli_narration: "Stimuli",
};

export function toQueueItem(recording: ApiRecording): ReviewQueueItem {
  return {
    id: recording.id,
    /* On every row. The id's first eight characters are a last resort, not
     * an identifier anybody reads. */
    contributor: recording.contributor_name ?? recording.contributor_id.slice(0, 8),
    mode: MODE[recording.session_type] ?? "Prompt reader",
    /* Measured from the stored file where we have it; the browser's figure
       was never checked. */
    duration: formatDuration(recording.measured_duration_seconds ?? recording.duration_seconds ?? 0),
    durationSec: Math.round(
      recording.measured_duration_seconds ?? recording.duration_seconds ?? 0
    ),
    submittedAt: relative(recording.created_at),
    prompt: recording.prompt_text ?? recording.stimulus_text ?? "",
    audioSrc: `/recordings/${recording.id}/audio`,
    device: recording.device_mic ?? NO_VALUE,
    /* The prompt's variety, which is what was actually spoken — a
     * contributor's profile holds a preference and can say "both". */
    language: VARIETY[recording.language_variety ?? ""] ?? NO_VALUE,
    status: recording.status === "submitted" || recording.status === "in_review"
      ? "pending"
      : "completed",
    assignedReviewerId: recording.assigned_reviewer_id ?? null,
    assignedReviewerName: recording.reviewer_name ?? null,
  };
}

export function useReviewQueue() {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [waiting, setWaiting] = useState<number | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isAssigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    Promise.all([
      /* Room for a desk dealt over 20 before 6 Nov, which drains rather than
         being cut. */
      reviewsApi.reviewQueue(100, true),
      /* A count is worth having but not worth failing the desk over. */
      reviewsApi.reviewBankCount(controller.signal).catch(() => null),
    ])
      .then(([desk, bank]) => {
        if (controller.signal.aborted) return;
        setItems(desk.map(toQueueItem));
        setWaiting(bank);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(reportApiError(cause, "Could not load the queue."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [attempt]);

  const reload = useCallback(() => setAttempt((v) => v + 1), []);

  /** Claims the next queued recording and returns its id. */
  const assignNext = useCallback(async () => {
    setAssigning(true);
    try {
      const recording = await reviewsApi.assignNext();
      setAttempt((v) => v + 1);
      return recording.id;
    } catch (cause) {
      setError(reportApiError(cause, "Nothing left to review."));
      return null;
    } finally {
      setAssigning(false);
    }
  }, []);

  return { items, waiting, isLoading, error, reload, assignNext, isAssigning };
}

export type HistoryView = {
  /** Blank for no search. */
  q: string;
  /** Omitted for the server's default, newest first. */
  sort?: { key: ApiRecordingSort; order: "asc" | "desc" };
  /** 1-based. */
  page: number;
  pageSize: number;
  /** Fetch nothing until the history is opened. */
  enabled: boolean;
};

/** The clips this reviewer has judged, a page at a time, from the server. */
export function useReviewHistory({ q, sort, page, pageSize, enabled }: HistoryView) {
  const { user } = useAuth();
  const userId = user?.id;
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isFetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sortKey = sort?.key;
  const sortOrder = sort?.order;

  useEffect(() => {
    if (!enabled || !userId) return;
    /* A page or search that is replaced is aborted, so a slow old answer
       cannot land on top of the new one. */
    const controller = new AbortController();
    setFetching(true);

    listRecordingsPage(
      {
        judged_by: userId,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        ...(q ? { q } : {}),
        ...(sortKey ? { sort: sortKey, order: sortOrder } : {}),
      },
      controller.signal
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        setItems(result.items.map(toQueueItem));
        setTotal(result.total);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(reportApiError(cause, "Could not load your reviews."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setFetching(false);
      });

    return () => controller.abort();
  }, [enabled, userId, q, sortKey, sortOrder, page, pageSize]);

  return { items, total, isFetching, error };
}
