import { describe, expect, it } from "vitest";
import { extractMarkers, injectMarkers, isMarkerWord, markerText } from "@/lib/annotation/tags";

describe("typed markers", () => {
  it("takes a known marker out and marks the word before it", () => {
    expect(extractMarkers("I no fit [laugh] abeg")).toEqual({
      text: "I no fit abeg",
      marks: [{ type: "laugh", afterWord: 2 }],
      unknown: [],
    });
  });

  it("saves a marker by the API's own name", () => {
    expect(extractMarkers("wait [throat-clear] okay").marks).toEqual([
      { type: "throat_clear", afterWord: 0 },
    ]);
  });

  it("leaves an unknown marker in the text and names it", () => {
    expect(extractMarkers("so [yawn] tired")).toEqual({
      text: "so [yawn] tired",
      marks: [],
      unknown: ["[yawn]"],
    });
  });

  it("keeps line breaks", () => {
    expect(extractMarkers("one [breath]\ntwo").text).toBe("one\ntwo");
  });

  it("reads a stored mark as its marker", () => {
    expect(markerText("background_noise")).toBe("[noise]");
    expect(markerText("cross_talk")).toBe("[cross-talk]");
  });

  it("writes marks back after their words, and reads them out again, for edit mode", () => {
    const marks = [
      { type: "throat_clear", afterWord: 1 },
      { type: "cross_talk", afterWord: 3 },
    ];
    const drawn = injectMarkers("Make we see how", marks);
    expect(drawn).toBe("Make we [throat-clear] see how [cross-talk]");
    expect(extractMarkers(drawn)).toEqual({ text: "Make we see how", marks, unknown: [] });
  });

  it("knows a marker word from a real one", () => {
    expect(isMarkerWord("[laugh]")).toBe(true);
    expect(isMarkerWord("[yawn]")).toBe(false);
    expect(isMarkerWord("laugh")).toBe(false);
  });
});
