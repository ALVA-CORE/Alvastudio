import { describe, expect, it } from "vitest";
import { NARRATION_MAX_SECONDS } from "@/lib/api/recordings";

/**
 * How long a narration take may run, mirrored from `ContributorStudioPage`.
 *
 * The rule is worth its own test because getting it wrong costs somebody
 * their recording: since 29 Oct a take over the cap is **refused**, not
 * truncated, so a contributor who talks for 2:05 loses the whole take to a
 * `422` after they have already spoken it.
 */
function takeLimit(
  mode: "prompt" | "stimuli",
  narration?: { max_recording_seconds: number; remaining_seconds: number }
) {
  if (mode !== "stimuli") return null;
  return Math.max(
    1,
    Math.min(
      narration?.max_recording_seconds ?? NARRATION_MAX_SECONDS,
      narration?.remaining_seconds ?? NARRATION_MAX_SECONDS
    )
  );
}

describe("narration take limit", () => {
  /* Prompt reading is counted in sentences and has no length limit. */
  it("does not cap a prompt read", () => {
    expect(takeLimit("prompt")).toBeNull();
  });

  it("caps at the API's per-take maximum", () => {
    expect(
      takeLimit("stimuli", { max_recording_seconds: 120, remaining_seconds: 900 })
    ).toBe(120);
  });

  /**
   * The case the whole thing exists for.
   *
   * With 40 s of today's narration left, a full 2-minute take would be
   * refused on arrival. Speaking time is never longer than the recording it
   * came from, so a take capped at what is left always fits.
   */
  it("caps at what is left of today when that is smaller", () => {
    expect(
      takeLimit("stimuli", { max_recording_seconds: 120, remaining_seconds: 40 })
    ).toBe(40);
  });

  /* Before the quota call answers. The alternative is letting somebody
     talk for two minutes into a 422. */
  it("falls back to the API's documented maximum when the quota is unknown", () => {
    expect(takeLimit("stimuli")).toBe(NARRATION_MAX_SECONDS);
  });

  /* Never zero or negative: a limit of 0 would stop the recorder on its
     first tick and produce an empty take rather than no take. */
  it("never returns a limit the recorder cannot use", () => {
    expect(
      takeLimit("stimuli", { max_recording_seconds: 120, remaining_seconds: 0 })
    ).toBe(1);
  });
});
