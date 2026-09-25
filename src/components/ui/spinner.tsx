import { cn } from "@/lib/utils";

type SpinnerProps = {
  /** Diameter in px. Defaults to 16, which sits right next to 14px button text. */
  size?: number;
  className?: string;
  /** Announced to screen readers. Set to "" inside a button that already says it. */
  label?: string;
};

/**
 * Broken-ring spinner — a faint full track with a bright quarter arc rotating
 * over it.
 *
 * Drawn as SVG rather than a bordered box so the stroke stays crisp at 14px and
 * the arc can have round caps. Both strokes are `currentColor`, so it inherits
 * whatever it is placed on — dark text on the accent button, muted grey on a
 * minimal one — and never needs a variant of its own.
 */
export function Spinner({ size = 16, className, label = "Loading" }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role={label ? "status" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      className={cn("shrink-0 animate-spin", className)}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeOpacity="0.25"
      />
      {/* Quarter arc — the gap is what reads as motion once it turns. */}
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
