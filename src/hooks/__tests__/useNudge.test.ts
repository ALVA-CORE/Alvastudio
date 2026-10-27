import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNudge, DAYS, MINUTES } from "../useNudge";

/**
 * A prompt that waits, asks once, and then leaves them alone.
 *
 * The three rules are the whole component: it must not fire on arrival, it
 * must not fire again inside the quiet period, and it must never fire once
 * the thing is done.
 */
const KEY = "alva-nudge-test";

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

const setup = (over: Partial<Parameters<typeof useNudge>[0]> = {}) =>
  renderHook(() =>
    useNudge({
      key: KEY,
      after: 5 * MINUTES,
      quietFor: 1 * DAYS,
      enabled: true,
      done: false,
      ...over,
    })
  );

describe("useNudge", () => {
  it("says nothing on arrival", () => {
    const { result } = setup();
    expect(result.current.open).toBe(false);
  });

  it("asks once the wait is over", () => {
    const { result } = setup();
    act(() => void vi.advanceTimersByTime(5 * MINUTES));
    expect(result.current.open).toBe(true);
  });

  it("stays quiet for the whole quiet period after a dismissal", () => {
    const first = setup();
    act(() => void vi.advanceTimersByTime(5 * MINUTES));
    act(() => first.result.current.dismiss());
    expect(first.result.current.open).toBe(false);

    /* A fresh mount, as a reload would be. */
    const second = setup();
    act(() => void vi.advanceTimersByTime(5 * MINUTES));
    expect(second.result.current.open).toBe(false);
  });

  it("asks again once the quiet period is over", () => {
    localStorage.setItem(KEY, String(Date.now() - 2 * DAYS));

    const { result } = setup();
    act(() => void vi.advanceTimersByTime(5 * MINUTES));
    expect(result.current.open).toBe(true);
  });

  it("never asks once it is done", () => {
    const { result } = setup({ done: true });
    act(() => void vi.advanceTimersByTime(30 * DAYS));
    expect(result.current.open).toBe(false);
  });

  it("waits until the answer is known", () => {
    /* `enabled` is false while the wallet is still loading. Starting the
       clock then would ask somebody to verify a NIN we had not yet checked. */
    const { result } = setup({ enabled: false });
    act(() => void vi.advanceTimersByTime(30 * MINUTES));
    expect(result.current.open).toBe(false);
  });
});
