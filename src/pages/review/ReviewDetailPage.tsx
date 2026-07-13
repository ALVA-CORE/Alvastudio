import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import AltArrowLeft from "@solar-icons/react/arrows/AltArrowLeft";
import {
  REVIEW_QUEUE,
  type AudioRegion,
  type QualityAnswers,
  type ReviewVerdict,
} from "@/data/reviewQueue";
import { alvaToast } from "@/lib/alva-toast";
import { ReviewWorkspace } from "@/components/review/ReviewWorkspace";
import { ReviewClipNavigation } from "@/components/review/ReviewClipNavigation";

const EMPTY_ANSWERS: QualityAnswers = {
  noiseFree: "",
  audible: "",
  matchesPrompt: "",
  natural: "",
  verdict: "",
};

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const activeIndex = REVIEW_QUEUE.findIndex((item) => item.id === id);
  const item = activeIndex >= 0 ? REVIEW_QUEUE[activeIndex] : undefined;

  const [answers, setAnswers] = useState<QualityAnswers>(EMPTY_ANSWERS);
  const [notes, setNotes] = useState("");
  const [regions, setRegions] = useState<AudioRegion[]>([]);

  useEffect(() => {
    setAnswers(EMPTY_ANSWERS);
    setNotes("");
    setRegions([]);
  }, [id]);

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
  };

  const goTo = (index: number) => {
    const next = REVIEW_QUEUE[index];
    if (next) navigate(`/review/${next.id}`);
  };

  return (
    <div className="relative px-4 py-4 pb-28 md:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-2">
        <Link
          to="/review"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <AltArrowLeft size={16} weight="Outline" />
          Back to queue
        </Link>

        <ReviewWorkspace
          item={item}
          answers={answers}
          onAnswersChange={setAnswers}
          notes={notes}
          onNotesChange={setNotes}
          regions={regions}
          onRegionsChange={setRegions}
          onVerdict={handleVerdict}
        />
      </div>

      <ReviewClipNavigation
        onPrevious={activeIndex > 0 ? () => goTo(activeIndex - 1) : undefined}
        onNext={
          activeIndex < REVIEW_QUEUE.length - 1 ? () => goTo(activeIndex + 1) : undefined
        }
      />
    </div>
  );
}
