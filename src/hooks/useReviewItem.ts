import { useCallback, useEffect, useRef, useState } from "react";
import { getRecording, recordingAudioUrl } from "@/lib/api/recordings";
import { reviewsForRecording, submitReview } from "@/lib/api/reviews";
import { ApiError } from "@/lib/api/client";
import { reportApiError } from "@/lib/api/reportApiError";
import { toQueueItem } from "@/hooks/useReviewQueue";
import type { QualityAnswers, ReviewQueueItem, ReviewVerdict } from "@/data/reviewQueue";

/**
 * One recording, ready to review.
 *
 * Two calls the queue deliberately does not make per row: the recording itself
 * and an authenticated fetch of its audio. The audio route needs the bearer
 * token, so it is fetched as a blob and handed back as an object URL — revoked
 * when the id changes or the page unmounts, or every clip reviewed would leak
 * its audio for the life of the tab.
 *
 * The prompt text used to be a third call. `RecordingOut` now carries
 * `prompt_text` and `stimulus_text`, so it comes back with the recording.
 */
/**
 * Why a verdict was refused, in words the reviewer can act on.
 *
 * The API's own sentence is used wherever it has one, because it knows what
 * happened and we are guessing. These three statuses get a line of their own
 * because each has a different next step, and "could not submit" has none:
 *
 * - **409** the clip already has a verdict, or has moved on. Nothing to
 *   retry; the queue has the current state.
 * - **403** it is not theirs to decide any more, which is what an admin
 *   reassigning it looks like from here.
 * - **404** it was deleted while they were working on it.
 *
 * The reassurance about their answers stays, because it is true and it is
 * the first thing somebody worries about.
 */
export function submitFailure(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.isUnreachable) {
      return "No connection, so nothing was sent. Your answers are safe here.";
    }

    const detail = cause.message?.trim();

    if (cause.status === 403) {
      return detail || "This clip is assigned to somebody else now, so your verdict was not recorded.";
    }
    if (cause.status === 409) {
      return detail || "This clip already has a verdict, so yours was not recorded.";
    }
    if (cause.status === 404) {
      return "This clip is no longer there, so there was nothing to decide.";
    }
    if (detail) return detail;
  }

  return "Could not submit. Your answers are safe here.";
}

export function useReviewItem(id: string | undefined) {
  const [item, setItem] = useState<ReviewQueueItem | null>(null);
  const [isLoading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id) {
      setItem(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const revoke = () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };

    (async () => {
      try {
        const recording = await getRecording(id);
        if (cancelled) return;

        const row = toQueueItem(recording);

        /* The verdict already on file, if there is one.
         *
         * Without this a completed review opened on another device, or after
         * a cleared browser, showed an empty rubric: the answers only lived
         * in a local draft. `GET /reviews/recording/{id}` has been in the API
         * the whole time and nothing was calling it.
         *
         * Newest last, so the most recent verdict wins if a clip was ever
         * reviewed more than once. */
        const verdicts =
          row.status === "completed"
            ? await reviewsForRecording(id).catch(() => [])
            : [];
        const latest = verdicts.at(-1);

        /* A clip whose audio failed to fetch is still worth showing — the
         * metadata and rubric are useful, and the player reports the gap. */
        const audio = await recordingAudioUrl(id).catch(() => null);
        if (cancelled) {
          if (audio) URL.revokeObjectURL(audio);
          return;
        }

        revoke();
        blobUrlRef.current = audio;

        setItem({
          ...row,
          audioSrc: audio ?? "",
          draft: latest
            ? {
                answers: {
                  noiseFree: latest.q_noise_free,
                  audible: latest.q_clear_audible,
                  matchesPrompt: latest.q_matches_prompt,
                  natural: latest.q_natural_intelligible,
                  /* Same three values either side, so this is a rename not a guess. */
                  verdict: latest.verdict,
                },
                notes: latest.notes ?? "",
                regions: [],
                playbackTime: 0,
                completed: true,
              }
            : row.draft,
        });
      } catch (cause) {
        if (cancelled) return;
        setError(reportApiError(cause, "Could not load this clip."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      revoke();
    };
  }, [id]);

  /**
   * Records the verdict.
   *
   * Resolves `null` when the API accepted it, and the reason when it did
   * not. The reason used to be swallowed: the hook stored it and the page
   * showed "Could not submit, your answers are safe" whatever had happened,
   * so a clip reassigned to somebody else, a clip already decided and a
   * server being down all read identically. The second half of that sentence
   * was true and the first half told nobody what to do next.
   */
  const submit = useCallback(
    async (answers: QualityAnswers, verdict: ReviewVerdict) => {
      if (!id) return "This clip is no longer open.";
      setSubmitting(true);
      try {
        await submitReview({
          recording_id: id,
          // The rubric maps 1:1 — see docs/backend/api.md §"Enum crosswalk".
          q_noise_free: answers.noiseFree as "yes" | "partial" | "no",
          q_clear_audible: answers.audible as "yes" | "partial" | "no",
          q_matches_prompt: answers.matchesPrompt as "yes" | "partial" | "no",
          q_natural_intelligible: answers.natural as "yes" | "partial" | "no",
          verdict,
        });
        return null;
      } catch (cause) {
        return submitFailure(cause);
      } finally {
        setSubmitting(false);
      }
    },
    [id]
  );

  return { item, isLoading, error, submit, isSubmitting };
}
