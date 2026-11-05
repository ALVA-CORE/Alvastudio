import { useEffect, useId, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useWave, WAVE_AMPLITUDE } from "@/lib/wave";
import { cn } from "@/lib/utils";

/**
 * A wavy fill over whatever it sits in, to `progress` (0 to 1).
 *
 * Two layers: a pale crest a little ahead, then the fill itself, which
 * carries `children` again in its own ink so a label stays readable as the
 * fill passes over it. The fill follows a slow spring rather than each
 * step. Place it inside a `relative` box with rounded corners; it covers the
 * box exactly.
 */
export function WaveFill({
  progress,
  className,
  fillClassName,
  aheadClassName,
  children,
}: {
  progress: number;
  className?: string;
  /** The fill's colour and the ink of `children` on it. */
  fillClassName: string;
  /** The paler crest ahead of it. */
  aheadClassName: string;
  children?: ReactNode;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const id = `wave-${useId().replace(/:/g, "")}`;
  const goal = useMotionValue(0);
  const smooth = useSpring(goal, { stiffness: 55, damping: 18, mass: 1 });

  useEffect(() => {
    goal.set(progress);
    if (reduceMotion) smooth.jump(progress);
  }, [goal, smooth, progress, reduceMotion]);

  const amplitude = reduceMotion ? 0 : WAVE_AMPLITUDE;
  const front = useWave(smooth, amplitude);
  const aheadBy = useTransform(smooth, (value) => (value <= 0 ? 0 : Math.min(1, value + 0.035)));
  const ahead = useWave(aheadBy, amplitude, Math.PI * 0.7);

  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-0 rounded-[inherit]", className)}>
      <svg width="0" height="0" className="absolute" focusable="false">
        <defs>
          <clipPath id={id} clipPathUnits="objectBoundingBox">
            <motion.path d={front} />
          </clipPath>
          <clipPath id={`${id}-ahead`} clipPathUnits="objectBoundingBox">
            <motion.path d={ahead} />
          </clipPath>
        </defs>
      </svg>
      <span
        className={cn("absolute inset-0 rounded-[inherit]", aheadClassName)}
        style={{ clipPath: `url(#${id}-ahead)` }}
      />
      <span
        className={cn("absolute inset-0 flex items-center justify-center gap-2 rounded-[inherit]", fillClassName)}
        style={{ clipPath: `url(#${id})` }}
      >
        {children}
      </span>
    </span>
  );
}
