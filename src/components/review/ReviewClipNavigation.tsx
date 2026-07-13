import AltArrowLeft from "@solar-icons/react/arrows/AltArrowLeft";
import AltArrowRight from "@solar-icons/react/arrows/AltArrowRight";
import { cn } from "@/lib/utils";

type ReviewClipNavigationProps = {
  onPrevious?: () => void;
  onNext?: () => void;
  className?: string;
};

export function ReviewClipNavigation({
  onPrevious,
  onNext,
  className,
}: ReviewClipNavigationProps) {
  return (
    <div className={cn("flex justify-center py-6", className)}>
      <div className="inline-flex items-center gap-2 rounded-full bg-alva-surface p-1">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!onPrevious}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <AltArrowLeft size={16} weight="Outline" />
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!onNext}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          Next clip
          <AltArrowRight size={16} weight="Outline" />
        </button>
      </div>
    </div>
  );
}
