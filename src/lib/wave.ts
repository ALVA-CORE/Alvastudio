import { useTime, useTransform, type MotionValue } from "motion/react";

/* The wave, in fractions of the box it fills (`objectBoundingBox`). A button
   is about four times wider than tall, so 0.03 across is a few pixels. */
export const WAVE_AMPLITUDE = 0.03;
/** Crests down the leading edge. */
const WAVE_CYCLES = 1.25;
/** Radians per second the crests travel. */
const WAVE_SPEED = 5;
/** Points sampled down the edge. Enough to read as a curve at button height. */
const WAVE_STEPS = 20;

/**
 * A filled region whose leading edge is a moving sine wave.
 *
 * `progress` 0 is entirely off the left, 1 entirely covers the box: the edge
 * is pushed out by one amplitude at each end so neither shows a sliver.
 */
export function wavePath(progress: number, timeMs: number, amplitude: number, phaseOffset = 0) {
  const edge = progress * (1 + 2 * amplitude) - amplitude;
  const phase = (timeMs / 1000) * WAVE_SPEED + phaseOffset;

  let d = "M0,0";
  for (let i = 0; i <= WAVE_STEPS; i += 1) {
    const y = i / WAVE_STEPS;
    const x = edge + amplitude * Math.sin(2 * Math.PI * WAVE_CYCLES * y + phase);
    d += ` L${x.toFixed(4)},${y.toFixed(4)}`;
  }
  return `${d} L0,1 Z`;
}

export function useWave(progress: MotionValue<number>, amplitude: number, phaseOffset = 0) {
  const time = useTime();
  return useTransform(() => wavePath(progress.get(), time.get(), amplitude, phaseOffset));
}
