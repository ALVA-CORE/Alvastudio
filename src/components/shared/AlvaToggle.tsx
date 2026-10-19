import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * On/off, in the brand accent.
 *
 * A toggle rather than a button, because the thing being changed is a state
 * the reader is looking at, not an action they are taking: "Turn on" has to be
 * read together with a separate label to know what is currently true, while a
 * switch *is* the answer.
 *
 * Off is `alva-surface`, which is the same grey as every other inert control,
 * so an off switch does not read as disabled. On is the accent, which on this
 * dark surface is the only saturated colour on the row.
 *
 * Built on a plain button with `role="switch"` rather than a dependency: it is
 * a track, a knob and `aria-checked`, and Radix's version would be a new
 * package for that.
 */
export function AlvaToggle({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alva-accent focus-visible:ring-offset-2 focus-visible:ring-offset-alva-card",
        checked ? "bg-alva-accent" : "bg-alva-surface",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <motion.span
        aria-hidden
        layout
        transition={{ type: "spring", stiffness: 520, damping: 34 }}
        className={cn(
          "block size-5 rounded-full shadow-sm",
          /* Dark knob on the accent so the lit half still reads as a track
             with something in it, light knob on grey for the same reason. */
          checked ? "ml-auto bg-alva-bg" : "mr-auto bg-foreground/60"
        )}
      />
    </button>
  );
}
