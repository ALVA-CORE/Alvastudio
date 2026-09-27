import { useCallback, useEffect, useRef, useState } from "react";
import { getRecording, recordingAudioUrl } from "@/lib/api/recordings";
import { submitReview } from "@/lib/api/reviews";
import { ApiError } from "@/lib/api/client";
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

        /* A clip whose audio failed to fetch is still worth showing — the
         * metadata and rubric are useful, and the player reports the gap. */
        const audio = await recordingAudioUrl(id).catch(() => null);
        if (cancelled) {
          if (audio) URL.revokeObjectURL(audio);
          return;
        }

        revoke();
        blobUrlRef.current = audio;

        setItem({ ...row, audioSrc: audio ?? "" });
      } catch (cause) {
        if (cancelled) return;
        setError(
          cause instanceof ApiError ? cause.message : "Could not load this clip."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      revoke();
    };
  }, [id]);

  /** Records the verdict. Resolves true only if the API accepted it. */
  const submit = useCallback(
    async (answers: QualityAnswers, verdict: ReviewVerdict) => {
      if (!id) return false;
      setSubmitting(true);
      try {
        await submitReview({
          recording_id: id,
          // The rubric maps 1:1 — see docs/api.md §"Enum crosswalk".
          q_noise_free: answers.noiseFree as "yes" | "partial" | "no",
          q_clear_audible: answers.audible as "yes" | "partial" | "no",
          q_matches_prompt: answers.matchesPrompt as "yes" | "partial" | "no",
          q_natural_intelligible: answers.natural as "yes" | "partial" | "no",
          verdict,
        });
        return true;
      } catch (cause) {
        setError(
          cause instanceof ApiError ? cause.message : "Could not submit the review."
        );
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [id]
  );

  return { item, isLoading, error, submit, isSubmitting };
}
