import type { AudioRegion, QualityAnswers, ReviewQueueItem, ReviewVerdict } from "@/data/reviewQueue";
import { ReviewAudioPlayer } from "@/components/review/ReviewAudioPlayer";
import { ReviewQualityForm } from "@/components/review/ReviewQualityForm";
import { ReviewActions } from "@/components/review/ReviewActions";

type ReviewWorkspaceProps = {
  item: ReviewQueueItem;
  answers: QualityAnswers;
  onAnswersChange: (answers: QualityAnswers) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  regions: AudioRegion[];
  onRegionsChange: (regions: AudioRegion[]) => void;
  playbackTime?: number;
  onPlaybackTimeChange?: (time: number) => void;
  onVerdict: (verdict: ReviewVerdict) => void;
};

export function ReviewWorkspace({
  item,
  answers,
  onAnswersChange,
  notes,
  onNotesChange,
  regions,
  onRegionsChange,
  playbackTime,
  onPlaybackTimeChange,
  onVerdict,
}: ReviewWorkspaceProps) {
  return (
    <div className="flex flex-col gap-2">
      <header className="rounded-2xl bg-alva-card p-4">
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
        regions={regions}
        onRegionsChange={onRegionsChange}
        initialPlaybackTime={playbackTime}
        onPlaybackTimeChange={onPlaybackTimeChange}
      />

      <div className="grid gap-2 lg:grid-cols-2">
        <ReviewQualityForm answers={answers} onChange={onAnswersChange} />
        <ReviewActions
          notes={notes}
          onNotesChange={onNotesChange}
          verdict={answers.verdict}
          onVerdict={onVerdict}
        />
      </div>
    </div>
  );
}
