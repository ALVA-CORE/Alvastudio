import { fetchAllPages, fetchAllRows } from "@/lib/api/fetchAll";
import { useCallback, useEffect, useState } from "react";
import * as reviewsApi from "@/lib/api/reviews";
import { listRecordings, type ApiRecording } from "@/lib/api/recordings";
import { listContributors, type ApiContributorRef } from "@/lib/api/users";
import { reportApiError } from "@/lib/api/reportApiError";
import type { ReviewQueueItem } from "@/data/reviewQueue";
import { NO_VALUE } from "@/lib/no-value";
import { useAuth } from "@/lib/auth/context";

/**
 * The intern review queue: their desk, and nobody else's.
 *
 * `/reviews/queue?mine` is what has been allocated to them and still needs a
 * verdict. `/recordings` is added for history, because a clip leaves that
 * queue the moment it is decided, and then filtered to rows that are theirs
 * or unassigned — a colleague's open work is not this intern's business and
 * should never have been in the list.
 *
 * The recording carries `prompt_text` and `stimulus_text`, so the queue
 * shows the real prompt rather than an id.
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

function duration(seconds: number | null): string {
  const total = Math.round(seconds ?? 0);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const VARIETY: Record<string, string> = {
  nigerian_english: "Nigerian English",
  nigerian_pidgin: "Nigerian Pidgin",
};

const MODE: Record<string, ReviewQueueItem["mode"]> = {
  prompt_read: "Prompt reader",
  stimuli_narration: "Stimuli",
};

export function toQueueItem(
  recording: ApiRecording,
  names: Map<string, string> = new Map()
): ReviewQueueItem {
  return {
    id: recording.id,
    /* A name when we can resolve one. The id's first eight characters are a
     * last resort, not an identifier anybody reads. */
    contributor:
      recording.contributor_name ??
      names.get(recording.contributor_id) ??
      recording.contributor_id.slice(0, 8),
    mode: MODE[recording.session_type] ?? "Prompt reader",
    duration: duration(recording.duration_seconds),
    durationSec: Math.round(recording.duration_seconds ?? 0),
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
  const [isLoading, setLoading] = useState(true);
  const [isAssigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  /* Whose desk this is. Without it every row would read as somebody else's
     and the queue would come back empty. */
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      /* The intern's own desk. Clips are allocated on submission now, so the
       * unassigned pool they used to read is usually empty. */
      reviewsApi.reviewQueue(100, true),
      fetchAllRows<ApiRecording>((query) => listRecordings(query)),
      /* Names, not ids. `RecordingOut` carries `contributor_id` and nothing
       * else, so one list turns every row's id into somebody's name.
       *
       * `/users/contributors` rather than `/users?role=contributor`: the
       * second is admin-only because it returns email, phone and account
       * state, so a reviewer got a 403 and every name on this screen fell
       * back to eight characters of a UUID. This one returns an id and a
       * name and nothing else.
       *
       * Failing here still costs the names, not the queue. */
      fetchAllPages<ApiContributorRef>((query) => listContributors(query)).catch(
        () => null
      ),
    ])
      .then(([queue, all, people]) => {
        if (cancelled) return;
        const names = new Map<string, string>(
          (people?.items ?? []).map((user) => [user.id, user.full_name])
        );

        /**
         * Only this intern's work, and work nobody has been given.
         *
         * `GET /recordings` returns every clip on the platform. It is here
         * for history — their own decided clips leave the `mine` queue the
         * moment they are decided — but unfiltered it also carried every
         * colleague's open desk into this list, where the only thing
         * marking them was an amber banner on the detail page saying
         * "somebody else's to decide".
         *
         * A banner is not the answer to that. The clip was never theirs to
         * open, and a list that shows it and then explains why you cannot
         * act on it is a list that wastes a tap and leaks a colleague's
         * workload at the same time.
         *
         * **This is a courtesy, not a boundary.** The rows still arrive in
         * the browser and are filtered here, so an intern who opens the
         * network tab still sees them. The fix is `GET /recordings` scoping
         * to the caller for a non-admin, which is asked for in
         * `docs/backend/endpoints-needed.md`.
         */
        const mine = (row: ApiRecording) =>
          !row.assigned_reviewer_id || row.assigned_reviewer_id === userId;

        const seen = new Set(queue.map((r) => r.id));
        const merged = [
          ...queue,
          ...all.filter((r) => !seen.has(r.id) && mine(r)),
        ];
        setItems(merged.map((row) => toQueueItem(row, names)));
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(reportApiError(cause, "Could not load the queue."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, userId]);

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

  return { items, isLoading, error, reload, assignNext, isAssigning };
}
