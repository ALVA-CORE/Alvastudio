import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Starts every route at the top.
 *
 * A client-side router keeps the scroll position across navigations, so
 * following a link from halfway down a long table drops you halfway down the
 * next page — usually past its own heading. Browsers do this correctly for a
 * real page load; this restores it.
 *
 * Keyed on pathname only. A search or hash change is movement *within* a page,
 * and yanking the view to the top when someone types in a filter would be
 * worse than the problem.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    /* The staff surfaces scroll an inner <main>, not the window, so the
     * element that actually moved has to be reset too. */
    document
      .querySelectorAll<HTMLElement>("[data-scroll-root]")
      .forEach((element) => {
        element.scrollTop = 0;
      });
  }, [pathname]);

  return null;
}
