import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AlvaSplash } from "@/components/shared/AlvaSplash";
import { useAuth } from "@/lib/auth/context";

/**
 * Holds the app back until both the session check and the splash are done.
 *
 * Two clocks, and the later one wins. The session check usually finishes
 * first, and if the splash unmounted the moment it did, the glow would be
 * cut off halfway up the screen — which reads as a glitch on the way in,
 * worse than no splash at all.
 *
 * It sits above the router rather than inside a route guard, because a guard
 * remounts on navigation: the splash would replay every time somebody moved
 * between protected routes.
 *
 * **Nothing is held for a fast boot.** `AlvaSplash` paints nothing until the
 * wait has proved slow, so if the session resolves inside its threshold the
 * animation never starts, `onDone` never fires, and this gets out of the way
 * immediately. The hold only exists once there is something to finish.
 */
export function BootGate({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth();
  const [animated, setAnimated] = useState(false);

  /* Whether the splash ever got as far as drawing itself. Without this, a
     boot that resolves inside the threshold would wait for an `onDone` that
     is never coming. */
  const started = useRef(false);
  const onDone = useCallback(() => {
    started.current = true;
    setAnimated(true);
  }, []);

  /* Once the session is known and the splash never started, there is nothing
     left to wait for. */
  useEffect(() => {
    if (!isLoading && !started.current) setAnimated(true);
  }, [isLoading]);

  if (isLoading || !animated) return <AlvaSplash onDone={onDone} />;

  return <>{children}</>;
}
