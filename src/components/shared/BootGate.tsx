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

  /**
   * Whether the splash ever got as far as drawing itself.
   *
   * A ref, and set on **start** rather than on finish. It used to be set in
   * `onDone`, which meant that between the first painted frame and the last
   * one this still read false — so a session check landing in that window
   * took the "it never started" branch and tore the splash down mid-rise.
   * The two states it has to tell apart are "not yet drawn" and "drawing",
   * and only a start signal can do that.
   *
   * A ref because the child announces it from an effect, and child effects
   * run before the parent's: by the time the `isLoading` effect below reads
   * it, it is already true. A state update would arrive a render too late.
   */
  const started = useRef(false);

  const onStart = useCallback(() => {
    started.current = true;
  }, []);

  const onDone = useCallback(() => setAnimated(true), []);

  /* Once the session is known and the splash never started, there is nothing
     left to wait for — a boot fast enough to stay under the threshold is
     held for nothing at all. */
  useEffect(() => {
    if (!isLoading && !started.current) setAnimated(true);
  }, [isLoading]);

  if (isLoading || !animated) return <AlvaSplash onStart={onStart} onDone={onDone} />;

  return <>{children}</>;
}
