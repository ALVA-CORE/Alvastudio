import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "../use-mobile";

/**
 * The first answer has to be the true one.
 *
 * It used to be `false` on every first render, whatever the viewport, and
 * only corrected in an effect. The intern dashboard redirects a phone to the
 * contributor one and the contributor dashboard redirects staff on a desktop
 * back, so with a hook that claims desktop on mount each hop remounted the
 * other page, reset the hook, and bounced straight back. The address bar
 * flicked between the two routes and never settled.
 */
function setWidth(width: number) {
  vi.stubGlobal("innerWidth", width);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: width < 768,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useIsMobile", () => {
  it("reports a phone on the very first render", () => {
    setWidth(390);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("reports a desktop on the very first render", () => {
    setWidth(1440);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("treats the breakpoint itself as desktop, at both sides of it", () => {
    setWidth(767);
    expect(renderHook(() => useIsMobile()).result.current).toBe(true);

    setWidth(768);
    expect(renderHook(() => useIsMobile()).result.current).toBe(false);
  });
});
