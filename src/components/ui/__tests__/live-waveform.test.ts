import { describe, expect, it } from "vitest";
import { bandAt } from "@/components/ui/live-waveform-band";

/**
 * The strip was lopsided: busy on the left, dead on the right.
 *
 * Not a drawing bug. Bar index was mapped straight onto the frequency range,
 * and a voice puts nearly all of its energy in the lowest bins, so the left
 * end was always lit and the right end never was. It read as a broken meter.
 * Reading outward from the centre makes it symmetric.
 */
describe("bandAt", () => {
  it("gives the two ends the same band", () => {
    for (const count of [2, 9, 10, 41, 64]) {
      expect(bandAt(0, count)).toBeCloseTo(bandAt(count - 1, count), 10);
    }
  });

  it("mirrors every pair either side of the middle", () => {
    const count = 40;
    for (let i = 0; i < count / 2; i += 1) {
      expect(bandAt(i, count)).toBeCloseTo(bandAt(count - 1 - i, count), 10);
    }
  });

  it("puts the low frequencies at the centre, where a voice lives", () => {
    const count = 40;
    const middle = bandAt(count / 2, count);
    const edge = bandAt(0, count);

    expect(middle).toBeLessThan(edge);
    expect(middle).toBeLessThan(0.1);
  });

  it("stays inside the spectrum at either end", () => {
    for (const count of [1, 2, 7, 64, 101]) {
      for (const index of [0, Math.floor(count / 2), count - 1]) {
        const band = bandAt(index, count);
        expect(band).toBeGreaterThanOrEqual(0);
        expect(band).toBeLessThan(1);
      }
    }
  });
});
