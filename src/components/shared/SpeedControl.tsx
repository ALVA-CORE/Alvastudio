import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/* Not exported: this file exports one component, which is what keeps fast
 * refresh working on it. Callers that want a different set pass `speeds`. */
const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

/**
 * Playback speed, folded away until it is wanted.
 *
 * Five rates laid out permanently is five targets competing with the transport
 * for the eye, and four of them are wrong at any moment. Closed, it states the
 * current rate and nothing else; open, it is the full set; picking one folds
 * it back. The control is its own answer.
 *
 * The open set is positioned absolutely over the closed pill, so opening it
 * takes no room in the flow. Laid out inline it widened its own column and
 * shoved the transport off centre every time it was touched, which is a
 * control that moves the thing you were aiming at.
 */
export function SpeedControl({
  value,
  onChange,
  speeds = PLAYBACK_SPEEDS,
  disabled = false,
  className,
}: {
  value: number;
  onChange: (speed: number) => void;
  speeds?: readonly number[];
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;

  /* A speed picker left hanging open is a speed picker in the way. */
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const spring = reduced
    ? { duration: 0 }
    : ({ type: "spring", stiffness: 520, damping: 36, mass: 0.7 } as const);

  const pill =
    "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent disabled:opacity-40";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {/* Holds the slot. Hidden rather than unmounted while open, so the row
          keeps its width and nothing beside it moves. */}
      <button
        type="button"
        disabled={disabled}
        aria-label={`Playback speed, ${value} times. Change it.`}
        onClick={() => setOpen(true)}
        className={cn(
          pill,
          "bg-alva-card text-foreground hover:text-alva-accent",
          open && "invisible"
        )}
      >
        {value}×
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.12 }}
            className="absolute left-0 top-1/2 z-20 flex -translate-y-1/2 items-center gap-0.5 rounded-full bg-alva-card p-0.5 shadow-[0_6px_18px_rgba(0,0,0,0.55)]"
          >
            {speeds.map((speed, index) => (
              <motion.button
                key={speed}
                type="button"
                aria-pressed={speed === value}
                onClick={() => {
                  onChange(speed);
                  setOpen(false);
                }}
                initial={{ opacity: 0, x: reduced ? 0 : -8, scale: reduced ? 1 : 0.7 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: reduced ? 0 : -8, scale: reduced ? 1 : 0.7 }}
                transition={{ ...spring, delay: reduced ? 0 : index * 0.025 }}
                className={cn(
                  pill,
                  speed === value
                    ? "bg-alva-accent text-alva-bg"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {speed}×
              </motion.button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
