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
