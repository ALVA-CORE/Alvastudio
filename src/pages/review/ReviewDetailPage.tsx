import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import AltArrowLeft from "@solar-icons/react/arrows/AltArrowLeft";
import Diskette from "@solar-icons/react/devices/Diskette";
import { BorderBeam } from "border-beam";
import {
  REVIEW_QUEUE,
  type AudioRegion,
  type QualityAnswers,
  type ReviewVerdict,
} from "@/data/reviewQueue";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { alvaToast } from "@/lib/alva-toast";
import {
  loadReviewProgress,
  saveReviewProgress,
  snapshotsEqual,
  type ReviewProgressSnapshot,
} from "@/lib/review-progress";
import { ReviewWorkspace } from "@/components/review/ReviewWorkspace";
import { ReviewClipNavigation } from "@/components/review/ReviewClipNavigation";
import { TextureButton } from "@/components/ui/texture-button";
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
  notes: string,
  regions: AudioRegion[],
  playbackTime: number,
  completed: boolean
): ReviewProgressSnapshot {
  return {
    answers,
    notes,
    regions,
    playbackTime,
    completed,
    savedAt: Date.now(),
  };
}

function resolveInitialState(item: (typeof REVIEW_QUEUE)[number]) {
  const saved = loadReviewProgress(item.id);
  if (saved) {
    return {
      answers: saved.answers,
      notes: saved.notes,
      regions: saved.regions,
      playbackTime: saved.playbackTime,
      completed: saved.completed,
    };
  }

  if (item.draft) {
    return {
      answers: item.draft.answers,
      notes: item.draft.notes,
      regions: item.draft.regions,
      playbackTime: item.draft.playbackTime,
      completed: item.draft.completed,
    };
  }

  return {
    answers: EMPTY_ANSWERS,
    notes: "",
    regions: [],
    playbackTime: 0,
    completed: item.status === "completed",
  };
}

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const activeIndex = REVIEW_QUEUE.findIndex((item) => item.id === id);
  const item = activeIndex >= 0 ? REVIEW_QUEUE[activeIndex] : undefined;

  const initial = item ? resolveInitialState(item) : null;

  const [answers, setAnswers] = useState<QualityAnswers>(initial?.answers ?? EMPTY_ANSWERS);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [regions, setRegions] = useState<AudioRegion[]>(initial?.regions ?? []);
  const [playbackTime, setPlaybackTime] = useState(initial?.playbackTime ?? 0);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const lastSavedRef = useRef<ReviewProgressSnapshot | null>(
    item
      ? buildSnapshot(
          initial?.answers ?? EMPTY_ANSWERS,
          initial?.notes ?? "",
          initial?.regions ?? [],
          initial?.playbackTime ?? 0,
          initial?.completed ?? false
        )
      : null
  );

  useEffect(() => {
    if (!item) return;

    const next = resolveInitialState(item);
    setAnswers(next.answers);
    setNotes(next.notes);
    setRegions(next.regions);
    setPlaybackTime(next.playbackTime);
    lastSavedRef.current = buildSnapshot(
      next.answers,
      next.notes,
      next.regions,
      next.playbackTime,
      next.completed
    );
    setIsDirty(false);
  }, [id]);

  const currentSnapshot = useCallback(
    () =>
      buildSnapshot(
        answers,
        notes,
        regions,
        playbackTime,
        Boolean(answers.verdict) || item?.status === "completed"
      ),
    [answers, notes, regions, playbackTime, item?.status]
  );

  useEffect(() => {
    if (!lastSavedRef.current) return;
    setIsDirty(!snapshotsEqual(currentSnapshot(), lastSavedRef.current));
  }, [currentSnapshot]);

  const persistProgress = useCallback(
    async (silent = false) => {
      if (!item) return false;
      setIsSaving(true);

      const snapshot = currentSnapshot();
      saveReviewProgress(item.id, snapshot);
      lastSavedRef.current = snapshot;
      setIsDirty(false);
      setIsSaving(false);

      if (!silent) {
        alvaToast.success("Progress saved");
      }

      return true;
    },
    [currentSnapshot, item]
  );

  useEffect(() => {
    if (!isDirty || !item) return;

    const timer = window.setTimeout(() => {
      void persistProgress(true);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [isDirty, item, persistProgress, answers, notes, regions, playbackTime]);

  useEffect(() => {
    if (!item) return;

    const interval = window.setInterval(() => {
      if (isDirty) void persistProgress(true);
    }, 45000);

    return () => window.clearInterval(interval);
  }, [isDirty, item, persistProgress]);

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
    return <Navigate to="/review" replace />;
  }

  const handleVerdict = (verdict: ReviewVerdict) => {
    setAnswers((prev) => ({ ...prev, verdict }));
    alvaToast.success(
      verdict === "approve"
        ? "Clip approved"
        : verdict === "reject"
          ? "Clip rejected"
          : "Clip flagged for review"
    );
    void persistProgress(true);
  };

  const handleBack = async () => {
    if (isDirty) {
      await persistProgress(true);
      alvaToast.success("Progress saved");
    }
    navigate("/review");
  };

  const goTo = async (index: number) => {
    if (isDirty) await persistProgress(true);
    const next = REVIEW_QUEUE[index];
    if (next) navigate(`/review/${next.id}`);
  };

  return (
    <DesktopPageShell className="relative pb-28 py-4">
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
          notes={notes}
          onNotesChange={setNotes}
          regions={regions}
          onRegionsChange={setRegions}
          playbackTime={playbackTime}
          onPlaybackTimeChange={setPlaybackTime}
          onVerdict={handleVerdict}
        />
      </div>

      <ReviewClipNavigation
        onPrevious={
          activeIndex > 0 ? () => void goTo(activeIndex - 1) : undefined
        }
        onNext={
          activeIndex < REVIEW_QUEUE.length - 1
            ? () => void goTo(activeIndex + 1)
            : undefined
        }
      />
    </DesktopPageShell>
  );
}
