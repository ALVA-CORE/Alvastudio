import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AlvaSplash } from "@/components/shared/AlvaSplash";
import { useAuth } from "@/lib/auth/context";

/**
 * A hard ceiling on the hold, in ms.
 *
 * Nothing should reach it: the splash always starts and always finishes. It
 * exists because the one unacceptable failure here is an app that never
 * renders, and a timer is cheaper than being sure.
 */
const CEILING_MS = 4000;

/**
 * Holds the app back until both the session check and the splash are done.
 *
 * Two clocks, and the later one wins. The session check usually finishes
 * first, and if the splash unmounted the moment it did, the glow would be
 * cut off halfway up the screen, which reads as a glitch on the way in.
 *
 * **It plays on every boot**, refresh or first visit, signed in or out. It
 * used to skip itself whenever the session resolved inside a threshold,
 * which was right for a loading indicator and wrong for this: a signed-out
 * visitor has no session to check, so they saw it never. The entrance to the
 * app should not depend on whether there happened to be a request to cover.
 *
 * It sits above the router rather than inside a route guard, because a guard
 * remounts on navigation and the splash would replay every time somebody
 * moved between protected routes.
 */
export function BootGate({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth();
  const [animated, setAnimated] = useState(false);

  const onDone = useCallback(() => setAnimated(true), []);

  /* The safety net, not the mechanism. */
  useEffect(() => {
    const timer = window.setTimeout(() => setAnimated(true), CEILING_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (isLoading || !animated) return <AlvaSplash onDone={onDone} />;

  return <>{children}</>;
}
