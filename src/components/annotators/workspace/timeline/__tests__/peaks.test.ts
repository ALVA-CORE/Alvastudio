import { describe, expect, it } from "vitest";
import { segmentPeaks } from "@/components/annotators/workspace/timeline/peaks";

/* A 10-second recording: silent for 5s, loud for 5s. */
const RECORDING = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1];

describe("segmentPeaks", () => {
  /**
   * The whole point of the change.
   *
   * These used to be synthesised from a hash of the segment id: stable,
   * distinct per clip, and matching nothing. Annotators read the waveform to
   * find where speech starts, so a shape that looks right and is wrong is
   * the worst kind of wrong here.
   */
  it("reads the slice of the recording the segment covers", () => {
    const quiet = segmentPeaks({
      peaks: RECORDING,
      durationSeconds: 10,
      start: 0,
      end: 5,
      sampleCount: 4,
    });
    const loud = segmentPeaks({
      peaks: RECORDING,
      durationSeconds: 10,
      start: 5,
      end: 10,
      sampleCount: 4,
    });

    expect(Math.max(...quiet)).toBeLessThan(Math.min(...loud));
  });

  /* Each bar is the loudest point it covers. Averaging would flatten every
     peak into the silence around it. */
  it("takes the peak of each bucket, not its average", () => {
    const bars = segmentPeaks({
      peaks: [0, 0, 0, 1],
      durationSeconds: 4,
      start: 0,
      end: 4,
      sampleCount: 1,
    });

    expect(bars[0]).toBe(1);
  });

  /**
   * Unmeasured audio draws flat bars, never a guessed shape.
   *
   * A wrong waveform is worse than an obviously empty one on this screen.
   */
  it("goes flat when there is nothing measured", () => {
    for (const peaks of [null, undefined, []]) {
      const bars = segmentPeaks({
        peaks,
        durationSeconds: 10,
        start: 0,
        end: 5,
        sampleCount: 6,
      });
      expect(bars).toHaveLength(6);
      expect(new Set(bars).size).toBe(1);
    }
  });

  /* A missing or zero duration cannot map seconds onto the array, so there
     is nothing honest to draw. */
  it("goes flat without a duration to map against", () => {
    const bars = segmentPeaks({
      peaks: RECORDING,
      durationSeconds: 0,
      start: 0,
      end: 5,
      sampleCount: 3,
    });
    expect(new Set(bars).size).toBe(1);
  });

  /* Bounds outside the recording, or a segment shorter than one bucket. */
  it("goes flat rather than slicing nothing", () => {
    const bars = segmentPeaks({
      peaks: RECORDING,
      durationSeconds: 10,
      start: 50,
      end: 60,
      sampleCount: 3,
    });
    expect(bars).toHaveLength(3);
    expect(new Set(bars).size).toBe(1);
  });

  it("always returns the number of bars asked for", () => {
    for (const count of [1, 7, 40]) {
      expect(
        segmentPeaks({
          peaks: RECORDING,
          durationSeconds: 10,
          start: 0,
          end: 10,
          sampleCount: count,
        })
      ).toHaveLength(count);
    }
  });
});
