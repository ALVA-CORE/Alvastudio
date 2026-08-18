import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useResizableHeight } from "../useResizableHeight";

/**
 * The handle sits on the panel's TOP edge, so the sign of the drag is inverted
 * against pointer movement. That inversion and the clamping are the whole
 * contract, and both are easy to regress into a panel that grows when you drag
 * it shut, or one that can be dragged past its own ruler.
 */

function pointer(clientY: number, id = 1) {
  const target = {
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
    hasPointerCapture: () => true,
  };

  return {
    button: 0,
    clientY,
    pointerId: id,
    currentTarget: target,
    preventDefault: () => {},
  } as never;
}

const BOUNDS = { preferred: 200, min: 50, max: 300 };

describe("useResizableHeight", () => {
  it("starts at the preferred height", () => {
    const { result } = renderHook(() => useResizableHeight(BOUNDS));
    expect(result.current.height).toBe(200);
  });

  it("clamps an out-of-range preferred height", () => {
    const { result } = renderHook(() =>
      useResizableHeight({ ...BOUNDS, preferred: 9999 })
    );
    expect(result.current.height).toBe(300);
  });

  it("follows a changing preferred height until the user resizes", () => {
    const { result, rerender } = renderHook((props) => useResizableHeight(props), {
      initialProps: { ...BOUNDS, preferred: 200 },
    });
    expect(result.current.height).toBe(200);

    // A speaker is removed: the panel shrinks to fit, untouched.
    rerender({ ...BOUNDS, preferred: 150 });
    expect(result.current.height).toBe(150);
  });

  it("keeps the user's height once they have resized", () => {
    const { result, rerender } = renderHook((props) => useResizableHeight(props), {
      initialProps: { ...BOUNDS, preferred: 200 },
    });

    act(() => result.current.handleProps.onPointerDown(pointer(500)));
    act(() => result.current.handleProps.onPointerMove(pointer(540)));
    act(() => result.current.handleProps.onPointerUp(pointer(540)));
    expect(result.current.height).toBe(160);

    // Adding a speaker must not silently undo an explicit choice.
    rerender({ ...BOUNDS, preferred: 260 });
    expect(result.current.height).toBe(160);
  });

  it("clamps a user height when the bounds shrink under it", () => {
    const { result, rerender } = renderHook((props) => useResizableHeight(props), {
      initialProps: { ...BOUNDS, preferred: 300, max: 300 },
    });

    act(() => result.current.handleProps.onPointerDown(pointer(500)));
    act(() => result.current.handleProps.onPointerMove(pointer(480)));
    expect(result.current.height).toBe(300);

    // Removing speakers lowers the ceiling; the panel must come with it.
    rerender({ ...BOUNDS, preferred: 120, max: 120 });
    expect(result.current.height).toBe(120);
  });

  it("grows when dragged UP, because the handle is on the top edge", () => {
    const { result } = renderHook(() => useResizableHeight(BOUNDS));

    act(() => result.current.handleProps.onPointerDown(pointer(500)));
    act(() => result.current.handleProps.onPointerMove(pointer(460)));

    expect(result.current.height).toBe(240);
  });

  it("shrinks when dragged down", () => {
    const { result } = renderHook(() => useResizableHeight(BOUNDS));

    act(() => result.current.handleProps.onPointerDown(pointer(500)));
    act(() => result.current.handleProps.onPointerMove(pointer(560)));

    expect(result.current.height).toBe(140);
  });

  it("never shrinks past the minimum", () => {
    const { result } = renderHook(() => useResizableHeight(BOUNDS));

    act(() => result.current.handleProps.onPointerDown(pointer(500)));
    act(() => result.current.handleProps.onPointerMove(pointer(5000)));

    expect(result.current.height).toBe(50);
  });

  it("never grows past the maximum", () => {
    const { result } = renderHook(() => useResizableHeight(BOUNDS));

    act(() => result.current.handleProps.onPointerDown(pointer(500)));
    act(() => result.current.handleProps.onPointerMove(pointer(-5000)));

    expect(result.current.height).toBe(300);
  });

  it("measures from the gesture's origin, so a long drag never drifts", () => {
    const { result } = renderHook(() => useResizableHeight(BOUNDS));

    act(() => result.current.handleProps.onPointerDown(pointer(500)));
    // Wandering back to the starting position must restore the original height.
    act(() => result.current.handleProps.onPointerMove(pointer(450)));
    act(() => result.current.handleProps.onPointerMove(pointer(520)));
    act(() => result.current.handleProps.onPointerMove(pointer(500)));

    expect(result.current.height).toBe(200);
  });

  it("ignores moves once the gesture has ended", () => {
    const { result } = renderHook(() => useResizableHeight(BOUNDS));

    act(() => result.current.handleProps.onPointerDown(pointer(500)));
    act(() => result.current.handleProps.onPointerUp(pointer(500)));
    act(() => result.current.handleProps.onPointerMove(pointer(400)));

    expect(result.current.height).toBe(200);
  });

  it("reports whether a resize is in flight", () => {
    const { result } = renderHook(() => useResizableHeight(BOUNDS));
    expect(result.current.isResizing).toBe(false);

    act(() => result.current.handleProps.onPointerDown(pointer(500)));
    expect(result.current.isResizing).toBe(true);

    act(() => result.current.handleProps.onPointerUp(pointer(500)));
    expect(result.current.isResizing).toBe(false);
  });

  it("nudges with the arrow keys, clamped the same way", () => {
    const { result } = renderHook(() => useResizableHeight({ ...BOUNDS, step: 10 }));

    act(() =>
      result.current.handleProps.onKeyDown({
        key: "ArrowUp",
        preventDefault: () => {},
      } as never)
    );
    expect(result.current.height).toBe(210);

    act(() =>
      result.current.handleProps.onKeyDown({
        key: "ArrowDown",
        preventDefault: () => {},
      } as never)
    );
    expect(result.current.height).toBe(200);
  });

  it("ignores a secondary mouse button", () => {
    const { result } = renderHook(() => useResizableHeight(BOUNDS));

    act(() =>
      result.current.handleProps.onPointerDown({
        ...(pointer(500) as object),
        button: 2,
      } as never)
    );
    act(() => result.current.handleProps.onPointerMove(pointer(400)));

    expect(result.current.height).toBe(200);
  });
});
