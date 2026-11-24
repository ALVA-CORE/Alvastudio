import { describe, expect, it } from "vitest";
import { keyLabel, tagForKey } from "@/lib/annotation/shortcuts";

describe("keyLabel", () => {
  it("writes keys the Mac way", () => {
    expect(keyLabel("Mod+Shift+Z", true)).toBe("⌘⇧Z");
    expect(keyLabel("Alt+T", true)).toBe("⌥T");
  });

  it("writes keys the Windows way", () => {
    expect(keyLabel("Mod+Shift+Z", false)).toBe("Ctrl+Shift+Z");
    expect(keyLabel("Alt+T", false)).toBe("Alt+T");
  });
});

describe("tagForKey", () => {
  it("gives a language for Alt and a number, a disfluency with Shift too", () => {
    expect(tagForKey({ altKey: true, shiftKey: false, code: "Digit1" })).toMatchObject({ kind: "language", value: "pcm" });
    expect(tagForKey({ altKey: true, shiftKey: true, code: "Digit2" })).toMatchObject({ kind: "disfluency", value: "repetition" });
    expect(tagForKey({ altKey: false, shiftKey: false, code: "Digit1" })).toBeUndefined();
  });
});
