import { useCallback, useEffect, useState } from "react";
import {
  assignReviewer,
  listRecordingsPage,
  type ApiRecording,
} from "@/lib/api/recordings";
import { listReviews, type ApiReviewRow } from "@/lib/api/reviews";
import { listUsers } from "@/lib/api/users";
import { reportApiError } from "@/lib/api/reportApiError";
import { formatDuration, relativeDays } from "@/data/admin/shared";
import type {
  AdminRecording,
  RecordingStatus,
  RejectionReason,
} from "@/data/admin/oversight";

const VARIETY: Record<string, "Nigerian English" | "Nigerian Pidgin"> = {
  nigerian_english: "Nigerian English",
  nigerian_pidgin: "Nigerian Pidgin",
};

const MODE: Record<string, AdminRecording["mode"]> = {
  prompt_read: "Prompt read",
  stimuli_narration: "Stimuli",
  focus_group: "Focus group",
};

/**
 * Why a clip was turned down, read back off the rubric.
 *
 * There is no rejection-reason field at the API. There are four answers, and
 * the first "no" among them is the reason, in the order a reviewer would have
 * noticed the problem: you hear the noise before you judge whether the reading
 * matched the prompt.
 */
function rejectionReason(review: ApiReviewRow | undefined): RejectionReason | undefined {
  if (!review || review.verdict !== "reject") return undefined;
  if (review.q_noise_free === "no") return "Background noise";
  if (review.q_clear_audible === "no") return "Too quiet";
  if (review.q_matches_prompt === "no") return "Does not match prompt";
  if (review.q_natural_intelligible === "no") return "Unnatural delivery";
  return "Clipped or truncated";
}

/**
 * The admin reviews screen: every clip, and the verdict on it.
 *
 * Three requests, not one per row. `GET /recordings` gives the clips but names
 * nobody, `GET /users` resolves the two ids on each, and `GET /reviews`
 * carries the rubric answers that the detail panel exists to show. Joining
 * them here means the table renders from one shape and the panel needs no
 * further fetch.
 */
export function useAdminReviews() {
  const [rows, setRows] = useState<AdminRecording[]>([]);
  const [reviews, setReviews] = useState<Map<string, ApiReviewRow>>(new Map());
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      listRecordingsPage({ limit: 200 }),
      listUsers({ limit: 200 }),
      listReviews({ limit: 200 }),
    ])
      .then(([recordings, users, reviewPage]) => {
        if (cancelled) return;

        const names = new Map(users.items.map((user) => [user.id, user.full_name]));
        const byRecording = new Map(
          reviewPage.items.map((review) => [review.recording_id, review])
        );

        setReviews(byRecording);
        setRows(
          recordings.items.map((recording, index) =>
            toAdminRecording(recording, index, names, byRecording)
          )
        );
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load recordings."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reassign = useCallback(
    async (recordingId: string, reviewerId: string | null, reviewerName: string) => {
      await assignReviewer(recordingId, reviewerId);
      setRows((prev) =>
        prev.map((row) =>
          row.id === recordingId ? { ...row, reviewer: reviewerName } : row
        )
      );
    },
    []
  );

  return {
    rows,
    reviews,
    isLoading,
    error,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
    reassign,
  };
}

function toAdminRecording(
  api: ApiRecording,
  index: number,
  names: Map<string, string>,
  reviews: Map<string, ApiReviewRow>
): AdminRecording {
  const submitted = new Date(api.created_at);
  const review = reviews.get(api.id);
  const durationSec = Math.round(api.duration_seconds ?? 0);

  return {
    id: api.id,
    /* A short human handle. The API's id is a UUID, which nobody reads out
     * over a call, and the list is ordered so position is stable enough. */
    code: `REC-${String(index + 1).padStart(4, "0")}`,
    contributor: api.contributor_name ?? names.get(api.contributor_id) ?? "Unknown",
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
    submittedLabel: relativeDays(submitted),
    rejectionReason: rejectionReason(review),
    audioUrl: "",
  };
}
