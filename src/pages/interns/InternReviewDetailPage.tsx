import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import AltArrowLeft from "@solar-icons/react/arrows/AltArrowLeft";
import Diskette from "@solar-icons/react/devices/Diskette";
import { BorderBeam } from "border-beam";
import {
  VERDICT_LABELS,
  calculateVerdictFromAnswers,
  getInternReviewQueue,
  type QualityAnswers,
} from "@/data/reviewQueue";
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
import { cn } from "@/lib/utils";

const EMPTY_ANSWERS: QualityAnswers = {
  noiseFree: "",
  audible: "",
  matchesPrompt: "",
  natural: "",
  verdict: "",
};

const INTERN_QUEUE = getInternReviewQueue();

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

function resolveInitialState(item: (typeof INTERN_QUEUE)[number]) {
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
  const activeIndex = INTERN_QUEUE.findIndex((item) => item.id === id);
  const item = activeIndex >= 0 ? INTERN_QUEUE[activeIndex] : undefined;

  const initial = item ? resolveInitialState(item) : null;

  const [answers, setAnswers] = useState<QualityAnswers>(initial?.answers ?? EMPTY_ANSWERS);
  const [playbackTime, setPlaybackTime] = useState(initial?.playbackTime ?? 0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  }, [id]);

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

  if (!item) {
    return <Navigate to="/intern/review" replace />;
  }

  const previousItem = activeIndex > 0 ? INTERN_QUEUE[activeIndex - 1] : undefined;
  const nextItem =
    activeIndex < INTERN_QUEUE.length - 1 ? INTERN_QUEUE[activeIndex + 1] : undefined;

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

    setIsSubmitting(true);
    const finalAnswers = { ...answers, verdict };
    setAnswers(finalAnswers);

    const snapshot = buildSnapshot(finalAnswers, playbackTime, true);
    saveReviewProgress(item.id, snapshot);
    lastSavedRef.current = snapshot;
    setIsDirty(false);

    alvaToast.success(`${VERDICT_LABELS[verdict]} — review submitted`);

    setIsSubmitting(false);

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
                className={cn("w-auto", isSaving && "opacity-70")}
                disabled={isSaving}
                onClick={() => void persistProgress()}
              >
                <Diskette size={15} weight="Bold" />
                {isSaving ? "Saving…" : isDirty ? "Save" : "Saved"}
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
          isSubmitting={isSubmitting}
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
