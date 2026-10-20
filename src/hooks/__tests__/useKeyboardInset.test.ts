import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useKeyboardInset } from "../useKeyboardInset";

/**
 * The whole point is a bottom sheet that does not hide under the keyboard, so
 * what matters is reporting a keyboard when there is one and reporting nothing
 * when there is not — a sheet that twitches on every scroll is worse than one
 * that sits still.
 */

type Listener = () => void;

function stubViewport(height: number, offsetTop = 0) {
  const listeners: Listener[] = [];

  const viewport = {
    height,
    offsetTop,
    addEventListener: (_: string, fn: Listener) => listeners.push(fn),
    removeEventListener: () => {},
  };

  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: viewport,
  });

  return {
    resize(nextHeight: number, nextOffsetTop = 0) {
      viewport.height = nextHeight;
      viewport.offsetTop = nextOffsetTop;
      act(() => listeners.forEach((fn) => fn()));
    },
  };
}

describe("useKeyboardInset", () => {
  afterEach(() => {
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: undefined,
    });
  });

  it("reports nothing when the viewport is whole", () => {
    stubViewport(window.innerHeight);
    const { result } = renderHook(() => useKeyboardInset());

    expect(result.current).toBe(0);
  });

  it("reports the covered height once a keyboard opens", () => {
    const viewport = stubViewport(window.innerHeight);
    const { result } = renderHook(() => useKeyboardInset());

    viewport.resize(window.innerHeight - 320);

    expect(result.current).toBe(320);
  });

  it("ignores a gap too small to be a keyboard", () => {
    /* Browser chrome and rounding move the visual viewport by a few pixels on
       any scroll. Reacting to those would make the sheet jitter. */
    const viewport = stubViewport(window.innerHeight);
    const { result } = renderHook(() => useKeyboardInset());

    viewport.resize(window.innerHeight - 40);

    expect(result.current).toBe(0);
  });

  it("counts a scrolled viewport as covered too", () => {
    const viewport = stubViewport(window.innerHeight);
    const { result } = renderHook(() => useKeyboardInset());

    viewport.resize(window.innerHeight - 260, 60);

    expect(result.current).toBe(200);
  });

  it("stays at zero where the browser has no visual viewport", () => {
    const { result } = renderHook(() => useKeyboardInset());

    expect(result.current).toBe(0);
  });
});
