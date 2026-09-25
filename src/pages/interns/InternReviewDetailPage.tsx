import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import AltArrowLeft from "@solar-icons/react/arrows/AltArrowLeft";
import Diskette from "@solar-icons/react/devices/Diskette";
import { BorderBeam } from "border-beam";
import {
  VERDICT_LABELS,
  calculateVerdictFromAnswers,
  type QualityAnswers,
} from "@/data/reviewQueue";
import { useReviewItem } from "@/hooks/useReviewItem";
import { useReviewQueue } from "@/hooks/useReviewQueue";
import { AlvaTableSkeleton } from "@/components/shared/states/AlvaTableSkeleton";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { ReviewClipNavigation } from "@/components/interns/review/ReviewClipNavigation";
import { ReviewWorkspace } from "@/components/interns/review/ReviewWorkspace";
import { alvaToast } from "@/lib/alva-toast";
import {
  loadReviewProgress,
  saveReviewProgress,
  snapshotsEqual,
  type ReviewProgressSnapshot,
} from "@/lib/review-progress";
import { TextureButton } from "@/components/ui/texture-button";
import type { ReviewQueueItem } from "@/data/reviewQueue";
import { cn } from "@/lib/utils";

const EMPTY_ANSWERS: QualityAnswers = {
  noiseFree: "",
  audible: "",
  matchesPrompt: "",
  natural: "",
  verdict: "",
};

function buildSnapshot(
  answers: QualityAnswers,
  playbackTime: number,
  completed: boolean
): ReviewProgressSnapshot {
  return {
    answers,
    notes: "",
    regions: [],
    playbackTime,
    completed,
    savedAt: Date.now(),
  };
}

function resolveInitialState(item: ReviewQueueItem) {
  const saved = loadReviewProgress(item.id);
  if (saved) {
    return {
      answers: saved.answers,
      playbackTime: saved.playbackTime,
      completed: saved.completed,
    };
  }

  if (item.draft) {
    return {
      answers: item.draft.answers,
      playbackTime: item.draft.playbackTime,
      completed: item.draft.completed,
    };
  }

  return {
    answers: EMPTY_ANSWERS,
    playbackTime: 0,
    completed: item.status === "completed",
  };
}

export default function InternReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  /* The clip itself — recording, prompt text and an authenticated audio URL.
   * The queue is fetched separately only to work out the neighbours for the
   * prev/next control; it is not what renders this page. */
  const { item: fetched, isLoading, error, submit, isSubmitting: isPosting } =
    useReviewItem(id);
  const { items: queue } = useReviewQueue();

  const item = fetched ?? undefined;
  const activeIndex = queue.findIndex((row) => row.id === id);

  const initial = item ? resolveInitialState(item) : null;

  const [answers, setAnswers] = useState<QualityAnswers>(initial?.answers ?? EMPTY_ANSWERS);
  const [playbackTime, setPlaybackTime] = useState(initial?.playbackTime ?? 0);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const lastSavedRef = useRef<ReviewProgressSnapshot | null>(
    item
      ? buildSnapshot(
          initial?.answers ?? EMPTY_ANSWERS,
          initial?.playbackTime ?? 0,
          initial?.completed ?? false
        )
      : null
  );

  useEffect(() => {
    if (!item) return;

    const next = resolveInitialState(item);
    setAnswers(next.answers);
    setPlaybackTime(next.playbackTime);
    lastSavedRef.current = buildSnapshot(
      next.answers,
      next.playbackTime,
      next.completed
    );
    setIsDirty(false);
    // `item` is the trigger, not just `id`: the clip arrives one render after
    // the route changes, and reading the saved draft before it lands would
    // seed the form from the previous clip.
  }, [item]);

  const currentSnapshot = useCallback(
    () =>
      buildSnapshot(
        answers,
        playbackTime,
        Boolean(answers.verdict) || item?.status === "completed"
      ),
    [answers, playbackTime, item?.status]
  );

  useEffect(() => {
    if (!lastSavedRef.current) return;
    setIsDirty(!snapshotsEqual(currentSnapshot(), lastSavedRef.current));
  }, [currentSnapshot]);

  const persistProgress = useCallback(
    async (silent = false, completed = false) => {
      if (!item) return false;
      setIsSaving(true);

      const snapshot = buildSnapshot(
        answers,
        playbackTime,
        completed || Boolean(answers.verdict) || item.status === "completed"
      );
      saveReviewProgress(item.id, snapshot);
      lastSavedRef.current = snapshot;
      setIsDirty(false);
      setIsSaving(false);

      if (!silent) {
        alvaToast.success("Progress saved");
      }

      return true;
    },
    [answers, playbackTime, item]
  );

  useEffect(() => {
    if (!isDirty || !item) return;

    const timer = window.setTimeout(() => {
      void persistProgress(true);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [isDirty, item, persistProgress, answers, playbackTime]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  if (isLoading) {
    return (
      <DesktopPageShell className="py-4">
        <AlvaTableSkeleton />
      </DesktopPageShell>
    );
  }

  /* A bad id is a wrong turn, not an error screen — back to the queue. A
   * reachable clip that failed to load is a real error and says so. */
  if (!item) {
    if (error) {
      return (
        <DesktopPageShell className="py-4">
          <p role="alert" className="mt-8 text-center text-sm text-destructive">
            {error}
          </p>
        </DesktopPageShell>
      );
    }
    return <Navigate to="/intern/review" replace />;
  }

  const previousItem = activeIndex > 0 ? queue[activeIndex - 1] : undefined;
  const nextItem =
    activeIndex >= 0 && activeIndex < queue.length - 1
      ? queue[activeIndex + 1]
      : undefined;

  const handleBack = async () => {
    if (isDirty) {
      await persistProgress(true);
      alvaToast.success("Progress saved");
    }
    navigate("/intern/review");
  };

  const handleSubmit = async () => {
    const verdict = calculateVerdictFromAnswers(answers);
    if (!verdict) return;

    const finalAnswers = { ...answers, verdict };
    setAnswers(finalAnswers);

    /* The verdict goes to the API first. Only once it is accepted do we clear
     * the local draft and move on — otherwise a failed POST would wipe the
     * intern's work and advance to the next clip as if it had landed. */
    const ok = await submit(finalAnswers, verdict);
    if (!ok) {
      alvaToast.error("Could not submit the review. Your answers are still here.");
      return;
    }

    const snapshot = buildSnapshot(finalAnswers, playbackTime, true);
    saveReviewProgress(item.id, snapshot);
    lastSavedRef.current = snapshot;
    setIsDirty(false);

    alvaToast.success(`${VERDICT_LABELS[verdict]} — review submitted`);

    if (nextItem) {
      navigate(`/intern/review/${nextItem.id}`);
      return;
    }

    navigate("/intern/review");
  };

  return (
    <DesktopPageShell className="py-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void handleBack()}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <AltArrowLeft size={16} weight="Outline" />
            Back to queue
          </button>

          <div className="relative overflow-visible rounded-full">
            <BorderBeam
              size="pulse-outside"
              colorVariant="mono"
              theme="dark"
              strength={1}
              duration={1.9}
              borderRadius={999}
              className="overflow-visible rounded-full"
            >
              <TextureButton
                variant="alva"
                size="sm"
                className="w-auto"
                loading={isSaving}
                onClick={() => void persistProgress()}
              >
                <Diskette size={15} weight="Bold" />
                {isDirty ? "Save" : "Saved"}
              </TextureButton>
            </BorderBeam>
          </div>
        </div>

        <ReviewWorkspace
          item={item}
          answers={answers}
          onAnswersChange={setAnswers}
          playbackTime={playbackTime}
          onPlaybackTimeChange={setPlaybackTime}
          onSubmit={() => void handleSubmit()}
          isSubmitting={isPosting}
        />
      </div>

      <ReviewClipNavigation
        onPrevious={
          previousItem ? () => navigate(`/intern/review/${previousItem.id}`) : undefined
        }
        onNext={nextItem ? () => navigate(`/intern/review/${nextItem.id}`) : undefined}
      />
    </DesktopPageShell>
  );
}
