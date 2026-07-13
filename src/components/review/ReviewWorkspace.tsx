import { useEffect, useState } from "react";
import type { QualityAnswers, ReviewQueueItem, ReviewVerdict, WaveMarker } from "@/data/reviewQueue";
import { alvaToast } from "@/lib/alva-toast";
import { ReviewAudioPlayer } from "@/components/review/ReviewAudioPlayer";
import { ReviewQualityForm } from "@/components/review/ReviewQualityForm";
import { ReviewActions } from "@/components/review/ReviewActions";
import { ReviewQueuePanel } from "@/components/review/ReviewQueuePanel";
import { ReviewClipNavigation } from "@/components/review/ReviewClipNavigation";

type ReviewWorkspaceProps = {
  item: ReviewQueueItem;
  queueItems: ReviewQueueItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
};

const EMPTY_ANSWERS: QualityAnswers = {
  noiseFree: "",
  audible: "",
  matchesPrompt: "",
  natural: "",
  verdict: "",
};

export function ReviewWorkspace({
  item,
  queueItems,
  activeId,
  onSelect,
  onPrevious,
  onNext,
}: ReviewWorkspaceProps) {
  const [answers, setAnswers] = useState<QualityAnswers>(EMPTY_ANSWERS);
  const [notes, setNotes] = useState("");
  const [markers, setMarkers] = useState<WaveMarker[]>([]);

  useEffect(() => {
    setAnswers(EMPTY_ANSWERS);
    setNotes("");
    setMarkers([]);
  }, [item.id]);

  const handleVerdict = (verdict: ReviewVerdict) => {
    setAnswers((prev) => ({ ...prev, verdict }));
    alvaToast.success(
      verdict === "approve"
        ? "Clip approved"
        : verdict === "reject"
          ? "Clip rejected"
          : "Clip flagged for review"
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-stretch gap-2">
        <ReviewQueuePanel
          items={queueItems}
          activeId={activeId}
          onSelect={onSelect}
        />

        <div className="my-4 w-px shrink-0 self-stretch bg-alva-border" />

        <div className="min-w-0 flex-1 space-y-2">
          <header className="rounded-2xl bg-alva-card p-4">
            <p className="text-xs text-muted-foreground">Now reviewing</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">{item.contributor}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.mode} · {item.duration} · {item.submittedAt}
            </p>

            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              <p>
                <span className="text-foreground">Device:</span> {item.device}
              </p>
              <p>
                <span className="text-foreground">Language:</span> {item.language}
              </p>
              <p>
                <span className="text-foreground">Clip ID:</span> {item.id}
              </p>
            </div>

            <div className="mt-3 rounded-xl bg-alva-surface p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Assigned prompt
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">{item.prompt}</p>
            </div>
          </header>

          <ReviewAudioPlayer
            src={item.audioSrc}
            markers={markers}
            onMarkersChange={setMarkers}
          />
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        <ReviewQualityForm answers={answers} onChange={setAnswers} />
        <ReviewActions
          notes={notes}
          onNotesChange={setNotes}
          verdict={answers.verdict}
          onVerdict={handleVerdict}
        />
      </div>

      <ReviewClipNavigation onPrevious={onPrevious} onNext={onNext} />
    </div>
  );
}
