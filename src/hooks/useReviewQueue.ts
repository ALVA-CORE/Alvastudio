import { useCallback, useEffect, useState } from "react";
import * as reviewsApi from "@/lib/api/reviews";
import { listRecordings, type ApiRecording } from "@/lib/api/recordings";
import { ApiError } from "@/lib/api/client";
import type { ReviewQueueItem } from "@/data/reviewQueue";

/**
 * The intern review queue.
 *
 * `/reviews/queue` is unclaimed work; `/recordings?status=` is everything the
 * reviewer can see. Both are merged into the row shape the table already
 * renders so the page's markup does not change.
 *
 * Prompt and stimulus TEXT is not on the recording — only the id. Resolving it
 * would be an N+1 per row, so the queue shows the id-derived label and the
 * detail page fetches the real text. See docs/backend-gaps.md.
 */

function relative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const hours = Math.floor((Date.now() - then) / 36e5);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : days < 7 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;
}

function duration(seconds: number | null): string {
  const total = Math.round(seconds ?? 0);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const MODE: Record<string, ReviewQueueItem["mode"]> = {
  prompt_read: "Prompt reader",
  stimuli_narration: "Stimuli",
};

export function toQueueItem(recording: ApiRecording): ReviewQueueItem {
  return {
    id: recording.id,
    contributor: recording.contributor_id.slice(0, 8),
    mode: MODE[recording.session_type] ?? "Prompt reader",
    duration: duration(recording.duration_seconds),
    durationSec: Math.round(recording.duration_seconds ?? 0),
    submittedAt: relative(recording.created_at),
    // Resolved on the detail page; the list would need one call per row.
    prompt: recording.prompt_id ?? recording.stimulus_id ?? "",
    audioSrc: `/recordings/${recording.id}/audio`,
    device: recording.device_mic ?? "—",
    language: "—",
    status: recording.status === "submitted" || recording.status === "in_review"
      ? "pending"
      : "completed",
  };
}

export function useReviewQueue() {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isAssigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      reviewsApi.reviewQueue(100),
      listRecordings({ limit: 100 }),
    ])
      .then(([queue, all]) => {
        if (cancelled) return;
        const seen = new Set(queue.map((r) => r.id));
        const merged = [...queue, ...all.filter((r) => !seen.has(r.id))];
        setItems(merged.map(toQueueItem));
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof ApiError ? cause.message : "Could not load the queue.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
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
      setError(cause instanceof ApiError ? cause.message : "Nothing left to review.");
      return null;
    } finally {
      setAssigning(false);
    }
  }, []);

  return { items, isLoading, error, reload, assignNext, isAssigning };
}
