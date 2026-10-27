import type { QualityAnswers, ReviewQueueItem } from "@/data/reviewQueue";
import { ReviewAudioBar } from "@/components/interns/review/ReviewAudioBar";
import { ReviewMetadataCard } from "@/components/interns/review/ReviewMetadataCard";
import { ReviewQualityForm } from "@/components/interns/review/ReviewQualityForm";

type ReviewWorkspaceProps = {
  item: ReviewQueueItem;
  answers: QualityAnswers;
  onAnswersChange: (answers: QualityAnswers) => void;
  playbackTime?: number;
  onPlaybackTimeChange?: (time: number) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  /** A verdict is already on file: show it, do not offer to change it. */
  readOnly?: boolean;
};

export function ReviewWorkspace({
  item,
  answers,
  onAnswersChange,
  playbackTime,
  onPlaybackTimeChange,
  onSubmit,
  isSubmitting,
  readOnly,
}: ReviewWorkspaceProps) {
  /* `min-w-0` on the grid and its children: a grid item's default
     `min-width: auto` lets a wide child — a waveform canvas, a UUID — push
     its column past the viewport, which is what was dragging the page
     sideways and taking the fixed bottom nav with it. */
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <ReviewAudioBar
        src={item.audioSrc}
        initialPlaybackTime={playbackTime}
        onPlaybackTimeChange={onPlaybackTimeChange}
      />

      <div className="grid min-w-0 gap-2 lg:grid-cols-2">
        <ReviewMetadataCard item={item} className="min-w-0" />
        <ReviewQualityForm
          answers={answers}
          onChange={onAnswersChange}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
