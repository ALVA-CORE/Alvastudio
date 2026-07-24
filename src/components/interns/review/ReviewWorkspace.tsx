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
};

export function ReviewWorkspace({
  item,
  answers,
  onAnswersChange,
  playbackTime,
  onPlaybackTimeChange,
  onSubmit,
  isSubmitting,
}: ReviewWorkspaceProps) {
  return (
    <div className="flex flex-col gap-2">
      <ReviewAudioBar
        src={item.audioSrc}
        initialPlaybackTime={playbackTime}
        onPlaybackTimeChange={onPlaybackTimeChange}
      />

      <div className="grid gap-2 lg:grid-cols-2">
        <ReviewMetadataCard item={item} />
        <ReviewQualityForm
          answers={answers}
          onChange={onAnswersChange}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
