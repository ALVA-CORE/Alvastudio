import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Measured now, not after the first paint.
 *
 * This used to start at `undefined` and return `!!undefined`, so every
 * component reported **desktop** on its first render and corrected itself in
 * an effect. Two pages that redirect to each other on this value then ping
 * pong forever: the intern dashboard sends a phone to the contributor one,
 * the contributor one sends staff on a desktop back, and each hop remounts
 * the other page and resets the hook to its lie. That is the address bar
 * flicking between the two routes without ever settling.
 *
 * Reading the width in the initialiser costs one synchronous layout query at
 * mount and makes the first answer the true one.
 */
function measure() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(measure);

  React.useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(measure());

    query.addEventListener("change", onChange);
    /* Re-read on mount: the viewport can change between the initialiser and
       the effect, and a resize that lands in that gap would otherwise be
       missed until the next one. */
    onChange();

    return () => query.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
