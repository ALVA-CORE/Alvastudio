import { useEffect, useId, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useWave, WAVE_AMPLITUDE } from "@/lib/wave";
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
 * While it runs, white fills it from the left behind a rolling wave, with a
 * paler wave just ahead of it for depth. The label under the fill is
 * redrawn in dark ink so it stays legible as the fill passes over it. The
 * fill follows a slow spring, not each step: one profile at a time would
 * otherwise read as a stutter.
 *
 * Once it is full it wobbles like jelly, lets the white go so the button
 * is back to its own face, and the upload icon morphs into a green check. The caller holds the phase and returns it to
 * `idle` after a moment.
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
  const reduceMotion = useReducedMotion() ?? false;
  const clipId = `export-fill-${useId().replace(/:/g, "")}`;
  const backClipId = `${clipId}-back`;

  const running = phase.kind === "running";
  const target =
    phase.kind === "running"
      ? phase.total
        ? phase.done / phase.total
        : 0
      : phase.kind === "done"
        ? 1
        : 0;

  const goal = useMotionValue(0);
  const progress = useSpring(goal, { stiffness: 55, damping: 18, mass: 1 });

  useEffect(() => {
    goal.set(target);
    /* Straight back to empty, out of sight, ready for next time. */
    if (phase.kind === "idle" || reduceMotion) progress.jump(target);
  }, [goal, progress, target, phase.kind, reduceMotion]);

  /* Done is when the fill reaches the end, not when the data does. The
     spring trails the last step by a beat, and celebrating over a button
     that is visibly still filling would be early. */
  const [full, setFull] = useState(false);
  useMotionValueEvent(progress, "change", (value) => {
    if (phase.kind === "done" && value > 0.995) setFull(true);
  });
  useEffect(() => {
    if (phase.kind === "idle") setFull(false);
    if (phase.kind === "done" && reduceMotion) setFull(true);
  }, [phase.kind, reduceMotion]);

  const amplitude = reduceMotion ? 0 : WAVE_AMPLITUDE;
  const front = useWave(progress, amplitude);
  /* A paler crest a little ahead, out of step with the front one. */
  const aheadBy = useTransform(progress, (value) =>
    value <= 0 ? 0 : Math.min(1, value + 0.035)
  );
  const back = useWave(aheadBy, amplitude, Math.PI * 0.7);

  const showFill = running || (phase.kind === "done" && !full);

  const icon = (
    <span className="relative grid size-[15px] place-items-center" aria-hidden>
      <AnimatePresence initial={false} mode="popLayout">
        {full ? (
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
            /* After the white has started to go, so the morph is seen. */
            transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.15 }}
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
    <motion.span
      className="relative inline-flex"
      initial={false}
      /* Jelly: squash wide, spring tall, settle. Scale X and Y move against
         each other, which is what reads as soft rather than as a pulse. */
      animate={
        full && !reduceMotion
          ? {
              scaleX: [1, 1.14, 0.92, 1.05, 0.98, 1],
              scaleY: [1, 0.86, 1.1, 0.96, 1.02, 1],
            }
          : { scaleX: 1, scaleY: 1 }
      }
      transition={{ duration: 0.75, ease: "easeOut" }}
    >
      {/* Clip paths for the fill, in the button's own box. */}
      <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <motion.path d={front} />
          </clipPath>
          <clipPath id={backClipId} clipPathUnits="objectBoundingBox">
            <motion.path d={back} />
          </clipPath>
        </defs>
      </svg>

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

        {/* Both layers reach past the label to the button's padded face:
            `-inset-x-4 -inset-y-2` is the `sm` size's `px-4 py-2`. */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -inset-x-4 -inset-y-2 rounded-full bg-white/35"
          style={{ clipPath: `url(#${backClipId})` }}
          initial={false}
          animate={{ opacity: showFill ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -inset-x-4 -inset-y-2 flex items-center justify-center gap-2 rounded-full bg-white text-neutral-900"
          style={{ clipPath: `url(#${clipId})` }}
          initial={false}
          animate={{ opacity: showFill ? 1 : 0 }}
          transition={{ duration: 0.35 }}
        >
          <span className="grid size-[15px] place-items-center">
            <Upload size={15} weight="Outline" />
          </span>
          {label}
        </motion.span>
      </TextureButton>
    </motion.span>
  );
}
