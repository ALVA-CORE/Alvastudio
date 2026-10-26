import { renderHook, act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStudioRecorder } from "../useStudioRecorder";

/**
 * Pausing must not be counted as audio.
 *
 * The duration used to be `Date.now() - startedAt`, which was right while a
 * take ran straight through. With a pause button it is not: a take paused for
 * two minutes would report two minutes of speech it does not contain, and the
 * API would be told a length the file disagrees with.
 */

class FakeRecorder {
  state: "inactive" | "recording" | "paused" = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  start() {
    this.state = "recording";
  }
  pause() {
    this.state = "paused";
  }
  resume() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["x"], { type: "audio/webm" }) });
    this.onstop?.();
  }
}

const track = { stop: vi.fn(), label: "Built-in Microphone" };

/**
 * Time is moved by stubbing `Date.now`, not with fake timers.
 *
 * `waitFor` polls on a real timer, so freezing the clock deadlocks every
 * assertion that waits for a phase to settle. The hook only ever reads
 * `Date.now`, so that is the only thing worth controlling.
 */
let now = 0;
const at = (seconds: number) => {
  now = seconds * 1000;
};

beforeEach(() => {
  now = 0;
  vi.spyOn(Date, "now").mockImplementation(() => now);

  vi.stubGlobal("MediaRecorder", FakeRecorder);
  (FakeRecorder as unknown as { isTypeSupported: () => boolean }).isTypeSupported =
    () => true;

  vi.stubGlobal("navigator", {
    ...navigator,
    mediaDevices: {
      getUserMedia: vi.fn(async () => ({
        getTracks: () => [track],
        getAudioTracks: () => [track],
      })),
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useStudioRecorder", () => {
  it("counts only the time it was actually recording", async () => {
    const { result } = renderHook(() => useStudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });
    await waitFor(() => expect(result.current.phase).toBe("recording"));

    /* Four seconds of speech. */
    act(() => {
      at(4);
      result.current.pauseRecording();
    });
    expect(result.current.phase).toBe("paused");

    /* Two minutes of silence that is not in the file. */
    act(() => {
      at(124);
      result.current.resumeRecording();
    });
    expect(result.current.phase).toBe("recording");

    /* Six more seconds of speech. */
    act(() => {
      at(130);
      result.current.stopRecording();
    });

    await waitFor(() => expect(result.current.phase).toBe("recorded"));
    expect(result.current.getDuration()).toBeCloseTo(10, 1);
  });

  it("counts what was banked when stopped from a pause", async () => {
    const { result } = renderHook(() => useStudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });
    await waitFor(() => expect(result.current.phase).toBe("recording"));

    act(() => {
      at(5);
      result.current.pauseRecording();
    });

    act(() => {
      at(300);
      result.current.stopRecording();
    });

    await waitFor(() => expect(result.current.phase).toBe("recorded"));
    expect(result.current.getDuration()).toBeCloseTo(5, 1);
  });

  it("starts a fresh take at zero rather than adding to the last one", async () => {
    const { result } = renderHook(() => useStudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });
    act(() => {
      at(8);
      result.current.stopRecording();
    });
    await waitFor(() => expect(result.current.getDuration()).toBeCloseTo(8, 1));

    act(() => {
      result.current.discardRecording();
    });
    expect(result.current.phase).toBe("idle");
    expect(result.current.getDuration()).toBe(0);

    await act(async () => {
      await result.current.startRecording();
    });
    act(() => {
      at(11);
      result.current.stopRecording();
    });

    await waitFor(() => expect(result.current.getDuration()).toBeCloseTo(3, 1));
  });

  it("releases the recorder when a paused take is discarded", async () => {
    /* A discard while paused used to leave a live MediaRecorder behind,
       which keeps the browser's mic indicator lit and makes the next start
       fail on a recorder that is already running. */
    const { result } = renderHook(() => useStudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });
    act(() => {
      result.current.pauseRecording();
    });
    expect(result.current.phase).toBe("paused");

    act(() => {
      result.current.discardRecording();
    });

    expect(result.current.phase).toBe("idle");
    expect(result.current.hasBlob).toBe(false);
  });
});
