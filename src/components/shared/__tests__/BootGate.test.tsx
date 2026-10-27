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

    act(() => {
      vi.advanceTimersByTime(10);
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

  /* A signed-out visitor has no session to check. They used to see nothing
     at all, because the gate released before the splash had drawn a frame.
     The entrance to the app should not depend on there happening to be a
     request to cover. */
  it("plays even when there is no session to check", () => {
    vi.useFakeTimers();
    loading = false;

    render(
      <BootGate>
        <App />
      </BootGate>
    );

    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("the app")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2200);
    });
    expect(screen.getByText("the app")).toBeInTheDocument();
  });

  /* The app must render even if the animation never reports back. */
  it("gives up and lets the app through rather than hanging", () => {
    vi.useFakeTimers();
    loading = false;

    render(
      <BootGate>
        <App />
      </BootGate>
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText("the app")).toBeInTheDocument();
  });
});
