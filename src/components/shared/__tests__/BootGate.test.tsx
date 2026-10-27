import { describe, expect, it, vi, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { BootGate } from "@/components/shared/BootGate";

let loading = true;
vi.mock("@/lib/auth/context", () => ({
  useAuth: () => ({ isLoading: loading }),
}));

afterEach(() => {
  vi.useRealTimers();
  loading = true;
});

const App = () => <p>the app</p>;

describe("BootGate", () => {
  /**
   * The bug this exists to stop.
   *
   * The session check almost always finishes before the animation does. If
   * that alone released the gate, the glow would be torn down halfway up the
   * screen — which reads as a glitch on the way in, worse than no splash.
   */
  it("holds the app until the animation is finished, not until the session is", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <BootGate>
        <App />
      </BootGate>
    );

    /* Past the threshold, so the splash is now painting. */
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();

    /* The session resolves mid-animation. This is the moment it used to
       break. */
    loading = false;
    act(() => {
      rerender(
        <BootGate>
          <App />
        </BootGate>
      );
    });
    expect(screen.queryByText("the app")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText("the app")).toBeInTheDocument();
  });

  /* And the counterpart: a boot fast enough never to draw the splash must
     not be held for an animation that is never going to play. */
  it("holds nothing when the session resolves below the threshold", () => {
    vi.useFakeTimers();
    loading = false;

    render(
      <BootGate>
        <App />
      </BootGate>
    );

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText("the app")).toBeInTheDocument();
  });
});
