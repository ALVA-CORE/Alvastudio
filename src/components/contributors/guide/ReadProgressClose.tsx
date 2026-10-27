import CloseCircle from "@solar-icons/react/ui/CloseCircle";
import { cn } from "@/lib/utils";

const SIZE = 30;
const STROKE = 2.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The close button, which is also the progress meter.
 *
 * One control instead of two signals. A separate "you have read 40%"
 * indicator somewhere else on the panel makes somebody hunt for the reason
 * the close button is not working; here the reason *is* the close button.
 * The ring fills, and when it is full the cross appears inside it.
 *
 * It is a real button throughout, disabled until the ring closes, so a
 * keyboard reader finds it where a close button belongs and is told why it
 * cannot be used yet rather than finding nothing at all.
 *
 * The cross is cross-faded and scaled in rather than path-morphed. A genuine
 * morph between a ring and two strokes is a lot of machinery for something
 * that reads, at this size, as the ring resolving into an X.
 */
export function ReadProgressClose({
  progress,
  onClose,
}: {
  /** 0 to 1. */
  progress: number;
  onClose: () => void;
}) {
  const clamped = Math.min(1, Math.max(0, progress));
  const complete = clamped >= 0.999;
  const percent = Math.round(clamped * 100);

  return (
    <button
      type="button"
      onClick={onClose}
      disabled={!complete}
      aria-label={complete ? "Close" : `Read to the end to close, ${percent}% done`}
      className={cn(
        "absolute right-4 top-4 z-20 grid size-8 place-items-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alva-accent",
        complete
          ? "text-foreground hover:text-alva-accent"
          : "cursor-default text-muted-foreground"
      )}
    >
      {/* The ring. Hidden once the cross has taken over, so the two are
          never both on screen fighting for the same 30 pixels. */}
      <svg
        aria-hidden
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={cn(
          "absolute transition-opacity duration-300",
          complete ? "opacity-0" : "opacity-100"
        )}
        fill="none"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE}
          className="stroke-alva-border"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
          /* Twelve o'clock, clockwise. A ring that starts at three and runs
             anticlockwise is the same number and the wrong gesture. */
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          className="stroke-alva-accent transition-[stroke-dashoffset] duration-300 ease-out"
        />
      </svg>

      <CloseCircle
        size={20}
        weight="Outline"
        className={cn(
          "transition-all duration-300",
          complete ? "scale-100 opacity-100" : "scale-50 opacity-0"
        )}
      />
    </button>
  );
}
