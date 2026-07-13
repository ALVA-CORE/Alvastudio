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
    <div
      className={cn(
        "pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 md:bottom-6",
        className
      )}
    >
      <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-alva-border/60 bg-alva-card/95 p-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
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
