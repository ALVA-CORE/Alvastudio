import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Upload from "@solar-icons/react/arrows-action/Upload";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import { TextureButton } from "@/components/ui/texture-button";

export type ExportPhase =
  | { kind: "idle" }
  | { kind: "running"; done: number; total: number }
  | { kind: "done" };

/**
 * An export button that is its own progress bar.
 *
 * While it runs, a white face fills it from the left, and the label under the
 * fill is redrawn in dark ink so it stays legible as the fill passes over it.
 * When it finishes, the fill fades out, the button is back to its own face,
 * and the upload icon morphs into a green check. The caller holds the phase
 * and returns it to `idle` after a moment.
 *
 * Not `disabled` while running. That would dim and desaturate the button,
 * which is exactly the surface the progress is drawn on, so clicks are
 * ignored here instead and `aria-busy` says why.
 */
export function ExportProgressButton({
  phase,
  disabled,
  onClick,
  label = "Export CSV",
}: {
  phase: ExportPhase;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
}) {
  const reduceMotion = useReducedMotion();
  const running = phase.kind === "running";
  const progress = running ? (phase.total ? phase.done / phase.total : 0) : phase.kind === "done" ? 1 : 0;

  /* A pill growing from the left. `round` keeps the leading edge as curved
     as the button's own ends. */
  const clip = `inset(0 ${(1 - progress) * 100}% 0 0 round 9999px)`;

  const icon = (
    <span className="relative grid size-[15px] place-items-center" aria-hidden>
      <AnimatePresence initial={false} mode="popLayout">
        {phase.kind === "done" ? (
          <motion.span
            key="check"
            className="col-start-1 row-start-1"
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.4, rotate: -90, filter: "blur(4px)" }
            }
            animate={{ opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.6, filter: "blur(4px)" }}
            /* After the fill has faded, so the morph is seen, not covered. */
            transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.3 }}
          >
            <CheckCircle size={15} weight="BoldDuotone" className="text-alva-accent" />
          </motion.span>
        ) : (
          <motion.span
            key="upload"
            className="col-start-1 row-start-1"
            initial={
              reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(4px)" }
            }
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.4, rotate: 90, filter: "blur(4px)" }
            }
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
          >
            <Upload size={15} weight="Outline" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );

  return (
    <TextureButton
      variant="minimal"
      size="sm"
      className="w-auto"
      disabled={disabled && phase.kind === "idle"}
      aria-busy={running || undefined}
      aria-label={
        running ? `Exporting, ${phase.done} of ${phase.total} profiles read` : undefined
      }
      onClick={() => {
        if (phase.kind !== "idle") return;
        onClick();
      }}
    >
      {icon}
      {label}

      {/* The fill, with the label again in dark ink inside it. Reaches past
          the label to the button's padded face: `-inset-x-4 -inset-y-2` is
          the `sm` size's `px-4 py-2`. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 -inset-y-2 flex items-center justify-center gap-2 rounded-full bg-white text-neutral-900"
        initial={false}
        animate={{
          clipPath: clip,
          opacity: running ? 1 : 0,
        }}
        transition={{
          clipPath: reduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 160, damping: 26 },
          /* Holds while the last stretch fills, then lets go: the check
             lands on the button's own face, not on white. */
          opacity: { duration: 0.35, delay: running ? 0 : 0.25 },
        }}
      >
        <span className="grid size-[15px] place-items-center">
          <Upload size={15} weight="Outline" />
        </span>
        {label}
      </motion.span>
    </TextureButton>
  );
}
