import { describe, expect, it, vi, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { AlvaSplash } from "@/components/shared/AlvaSplash";

afterEach(() => {
  vi.useRealTimers();
});

describe("AlvaSplash", () => {
  /* The whole reason for the threshold: a boot check is usually one fast
     request, and a splash that appears and vanishes inside 200ms is a flash
     rather than a brand moment. */
  it("draws nothing but a tinted page until the wait proves slow", () => {
    vi.useFakeTimers();
    render(<AlvaSplash delayMs={220} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(219);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  /* A screen reader should not be made to watch a wordmark type itself out,
     so the full name is present from the first frame even though only part
     of it is painted. */
  it("names itself in full before it has finished typing", () => {
    vi.useFakeTimers();
    render(<AlvaSplash delayMs={0} />);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByRole("status")).toHaveAccessibleName("Loading Alvacore");
    expect(screen.getByText("Alvacore")).toBeInTheDocument();
  });
});

describe("AlvaSplash handover", () => {
  /* The reason `onDone` exists: the session check usually finishes first,
     and unmounting the splash the moment it does cuts the glow off halfway
     up the screen, which reads as a glitch rather than a loading screen. */
  it("does not hand over until the animation has played out", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<AlvaSplash delayMs={0} onDone={onDone} />);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDone).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onDone).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onDone).toHaveBeenCalledOnce();
  });

  /* And the counterpart: a boot fast enough never to draw the splash must
     never fire `onDone`, or a caller waiting on it would hold the app open
     on a screen nobody can see. */
  it("never fires while it is below the threshold", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<AlvaSplash delayMs={5000} onDone={onDone} />);

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(onDone).not.toHaveBeenCalled();
  });
});
