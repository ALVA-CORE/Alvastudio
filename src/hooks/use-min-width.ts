import { useSyncExternalStore } from "react";

/**
 * Subscribes to one media query.
 *
 * Read as an external store rather than set from an effect, so the first
 * render already has the real answer instead of flashing the fallback.
 */
export function useMinWidth(query: string, fallback: boolean): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => fallback
  );
}
