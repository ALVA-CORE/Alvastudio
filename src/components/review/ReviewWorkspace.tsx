import { useEffect, useMemo, useState } from "react";
import {
  REGION_TAGS,
  type QualityAnswers,
  type RegionTag,
  type ReviewQueueItem,
  type ReviewVerdict,
  type TimestampMarker,
} from "@/data/reviewQueue";
import { alvaToast } from "@/lib/alva-toast";
import { ReviewAudioPlayer } from "@/components/review/ReviewAudioPlayer";
import { ReviewAnnotationTools } from "@/components/review/ReviewAnnotationTools";
import { ReviewQualityForm } from "@/components/review/ReviewQualityForm";
import { ReviewActions } from "@/components/review/ReviewActions";

type ReviewWorkspaceProps = {
  item: ReviewQueueItem;
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
  onPrevious,
  onNext,
}: ReviewWorkspaceProps) {
  const [answers, setAnswers] = useState<QualityAnswers>(EMPTY_ANSWERS);
  const [notes, setNotes] = useState("");
  const [activeTag, setActiveTag] = useState<RegionTag>("background-noise");
  const [markers, setMarkers] = useState<TimestampMarker[]>([]);
  const [playheadTime, setPlayheadTime] = useState(0);

  const markerTimes = useMemo(() => markers.map((marker) => marker.time), [markers]);

  useEffect(() => {
    setAnswers(EMPTY_ANSWERS);
    setNotes("");
    setMarkers([]);
    setPlayheadTime(0);
  }, [item.id]);

  const handleAddMarker = () => {
    const tag = REGION_TAGS.find((entry) => entry.id === activeTag);
    if (!tag) return;

    setMarkers((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        time: playheadTime,
        tag: activeTag,
        label: tag.label,
      },
    ]);
    alvaToast.show(`Marker added: ${tag.label}`);
  };

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
    <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-y-auto p-4">
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
        markers={markerTimes}
        onTimeUpdate={setPlayheadTime}
      />

      <div className="grid gap-2 xl:grid-cols-2">
        <ReviewAnnotationTools
          markers={markers}
          activeTag={activeTag}
          onActiveTagChange={setActiveTag}
          onAddMarker={handleAddMarker}
          onRemoveMarker={(id) =>
            setMarkers((prev) => prev.filter((marker) => marker.id !== id))
          }
        />
        <ReviewQualityForm answers={answers} onChange={setAnswers} />
      </div>

      <ReviewActions
        notes={notes}
        onNotesChange={setNotes}
        verdict={answers.verdict}
        onVerdict={handleVerdict}
        onPrevious={onPrevious}
        onNext={onNext}
      />
    </div>
  );
}
