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
      <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-alva-border/60 bg-alva-card/95 p-0.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!onPrevious}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <AltArrowLeft size={14} weight="Outline" />
          Prev
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!onNext}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          Next
          <AltArrowRight size={14} weight="Outline" />
        </button>
      </div>
    </div>
  );
}
