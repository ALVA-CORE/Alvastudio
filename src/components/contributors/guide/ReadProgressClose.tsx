import CloseCircle from "@solar-icons/react/ui/CloseCircle";
import { cn } from "@/lib/utils";

const SIZE = 34;
const STROKE = 2.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The close button, which is also the scroll progress meter.
 *
 * One control instead of two signals. A separate indicator elsewhere makes
 * somebody hunt for the reason the close button is not working; here the
 * reason *is* the close button. The ring fills as they read, and when it is
 * full the cross appears inside it.
 *
 * **The track has to be visible.** The first version drew it in
 * `alva-border` with no arc at all at zero, which on a dark card is nothing
 * — the button simply was not there, and the only thing anybody could tell
 * was that the X had gone missing. A filled disc behind it and a track at
 * `white/15` make it a control before it is a meter.
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
        "absolute right-4 top-4 z-30 grid size-9 place-items-center rounded-full",
        "bg-alva-surface transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alva-accent",
        complete
          ? "text-foreground hover:text-alva-accent"
          : "cursor-default text-muted-foreground"
      )}
    >
      {/* The ring. Faded out once the cross has taken over, so the two are
          never both competing for the same thirty pixels. */}
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
          className="stroke-white/15"
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
          "relative transition-all duration-300",
          complete ? "scale-100 opacity-100" : "scale-50 opacity-0"
        )}
      />
    </button>
  );
}
