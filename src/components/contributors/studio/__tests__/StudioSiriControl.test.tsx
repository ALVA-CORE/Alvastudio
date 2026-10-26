import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StudioSiriControl } from "../StudioSiriControl";

/* The waveform opens an AudioContext and paints to a canvas, neither of
   which jsdom has. What is under test is the press, not the drawing. */
vi.mock("@/components/ui/live-waveform", () => ({
  LiveWaveform: () => <div data-testid="waveform" />,
}));

/**
 * Tap stops, hold pauses.
 *
 * Both are wanted while recording and only one control is on screen, so the
 * two have to part on how long the press lasts. The release after a hold is
 * the case worth guarding: it is still a click, and left alone it would stop
 * the take that was just paused.
 */
describe("StudioSiriControl", () => {
  /**
   * A press of a given length, as a browser delivers it.
   *
   * The click after pointerup is the part that matters: it is what the
   * component has to suppress once a hold has already fired, and a helper
   * that left it out would make the hold test pass for the wrong reason.
   */
  const press = async (element: Element, ms: number) => {
    fireEvent.pointerDown(element);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, ms));
    });
    fireEvent.pointerUp(element);
    fireEvent.click(element);
  };

  it("stops the take on a tap", async () => {
    const onPrimary = vi.fn();
    const onHold = vi.fn();
    render(
      <StudioSiriControl phase="recording" onPrimary={onPrimary} onHold={onHold} />
    );

    await userEvent.click(screen.getByRole("button"));

    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onHold).not.toHaveBeenCalled();
  });

  it("pauses on a hold, and does not also stop on the release", async () => {
    const onPrimary = vi.fn();
    const onHold = vi.fn();
    render(
      <StudioSiriControl phase="recording" onPrimary={onPrimary} onHold={onHold} />
    );

    await press(screen.getByRole("button"), 600);

    await waitFor(() => expect(onHold).toHaveBeenCalledTimes(1));
    expect(onPrimary).not.toHaveBeenCalled();
  });

  it("only holds while a take is being recorded", async () => {
    /* There is nothing to pause on a finished take: the press plays it. */
    const onPrimary = vi.fn();
    const onHold = vi.fn();
    render(
      <StudioSiriControl phase="recorded" onPrimary={onPrimary} onHold={onHold} />
    );

    await press(screen.getByRole("button"), 600);

    expect(onHold).not.toHaveBeenCalled();
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });

  it("says what the press will do, including the hold", () => {
    const { rerender } = render(
      <StudioSiriControl phase="idle" onPrimary={vi.fn()} onHold={vi.fn()} />
    );
    expect(screen.getByRole("button")).toHaveAccessibleName("Start recording");

    rerender(
      <StudioSiriControl phase="recording" onPrimary={vi.fn()} onHold={vi.fn()} />
    );
    expect(screen.getByRole("button")).toHaveAccessibleName(
      "Stop recording. Press and hold to pause"
    );

    rerender(
      <StudioSiriControl phase="paused" onPrimary={vi.fn()} onHold={vi.fn()} />
    );
    expect(screen.getByRole("button")).toHaveAccessibleName("Resume recording");

    rerender(
      <StudioSiriControl phase="playing" onPrimary={vi.fn()} onHold={vi.fn()} />
    );
    expect(screen.getByRole("button")).toHaveAccessibleName("Pause playback");
  });
});
