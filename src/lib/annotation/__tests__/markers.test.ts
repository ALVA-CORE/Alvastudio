import { describe, expect, it } from "vitest";
import {
  extractMarkers,
  findSoundTags,
  injectMarkers,
  insertMarker,
  isMarkerWord,
  markerAround,
  markerAtCaret,
  markerText,
  replaceMarker,
} from "@/lib/annotation/markers";

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

  it("drops an empty [] and splits a marker touching words", () => {
    expect(extractMarkers("so [] fine").text).toBe("so fine");
    expect(extractMarkers("Make[laugh]we").text).toBe("Make we");
    expect(extractMarkers("Make[laugh]we").marks).toEqual([{ type: "laugh", afterWord: 0 }]);
  });
});

describe("typing a marker", () => {
  it("finds the [ being typed, and a ] typed first after the caret", () => {
    expect(markerAtCaret("say [la", 7)).toEqual({ from: 4, to: 7, query: "la" });
    expect(markerAtCaret("say []", 5)).toEqual({ from: 4, to: 6, query: "" });
    expect(markerAtCaret("say la", 6)).toBeNull();
  });

  it("replaces a typed [] whole, so no stray ] is left", () => {
    expect(insertMarker("say []", { from: 4, to: 6 }, "laugh")).toEqual({ value: "say [laugh] ", caret: 12 });
  });

  it("keeps a space either side when [ was typed against a word", () => {
    expect(insertMarker("say[word", { from: 3, to: 4 }, "laugh").value).toBe("say [laugh] word");
  });
});

describe("sound tags", () => {
  it("lists them by the lead's families, and searches by word or name", () => {
    const families = findSoundTags("").map((tag) => tag.family);
    expect(families.indexOf("Environment")).toBeGreaterThan(families.lastIndexOf("Speaker sounds"));
    expect(findSoundTags("thro").map((tag) => tag.type)).toEqual(["throat_clear"]);
    expect(findSoundTags("Tone").map((tag) => tag.marker)).toEqual(["beep"]);
  });

  it("finds the marker the caret is on, and changes or removes it", () => {
    const text = "Make [laugh] we";
    const at = markerAround(text, 7);
    expect(at).toEqual({ from: 5, to: 12, type: "laugh" });
    expect(replaceMarker(text, at!, "cough")).toBe("Make [cough] we");
    expect(replaceMarker(text, at!, null)).toBe("Make we");
    expect(markerAround(text, 2)).toBeNull();
  });
});
