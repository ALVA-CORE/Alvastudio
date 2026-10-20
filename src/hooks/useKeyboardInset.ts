import { useEffect, useState } from "react";

/**
 * How much of the window the on-screen keyboard is covering, in pixels.
 *
 * A `position: fixed; bottom: 0` element is pinned to the LAYOUT viewport,
 * which the keyboard does not shrink. The keyboard shrinks the VISUAL
 * viewport, so a bottom sheet with a field in it slides underneath the
 * keyboard the moment that field is focused: the sheet is still there, still
 * focused, and completely unreachable.
 *
 * `visualViewport` is the only thing that reports this. The gap is the layout
 * height minus what is still visible, which is the keyboard plus anything the
 * browser has scrolled away.
 *
 * Returns 0 where there is no keyboard, no `visualViewport`, or the page is
 * merely being pinch-zoomed — so a desktop sheet is untouched.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const measure = () => {
      const covered = window.innerHeight - viewport.height - viewport.offsetTop;

      /* A few pixels of difference are rounding and browser chrome, not a
       * keyboard. Below this the sheet stays where it is rather than
       * twitching on every scroll. */
      setInset(covered > 80 ? Math.round(covered) : 0);
    };

    measure();
    viewport.addEventListener("resize", measure);
    viewport.addEventListener("scroll", measure);

    return () => {
      viewport.removeEventListener("resize", measure);
      viewport.removeEventListener("scroll", measure);
    };
  }, []);

  return inset;
}
