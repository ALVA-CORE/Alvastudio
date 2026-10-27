import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";

/** How long after arriving before the guide shows itself, in ms. */
const AFTER_MS = 5000;

const KEY = "alva-guide-read";

function readFlag(scope: string): boolean {
  try {
    return localStorage.getItem(`${KEY}:${scope}`) === "1";
  } catch {
    /* Blocked storage reads as "not yet read". Showing the guide twice is a
       much smaller cost than never showing it to somebody whose first
       session is the only one that matters. */
    return false;
  }
}

/**
 * Shows the guide once, five seconds into a contributor's first session.
 *
 * **Five seconds, not immediately.** A sheet over somebody's first screen is
 * a thing to dismiss rather than read, and it teaches people to close
 * whatever appears. A few seconds in, they have looked around and the
 * interruption has somewhere to land.
 *
 * **Per account, in `localStorage`.** This is a per-viewer convenience: two
 * people on one laptop should not inherit each other's state, and losing it
 * costs one repeated reading rather than any data. It deliberately does not
 * go to the API, because "has read the guide" is not a fact about the
 * account, it is a fact about this browser.
 *
 * It fires once and then never again, which is why `due` latches rather than
 * recomputing: a re-render during the session must not reopen a sheet
 * somebody has just finished with.
 */
export function useGuideIntro(enabled: boolean) {
  const { user, isAuthenticated } = useAuth();
  const scope = user?.id ?? "anon";

  const [read, setRead] = useState(() => readFlag(scope));
  const [due, setDue] = useState(false);

  /* Switching account re-reads the flag: the new person may not have seen
     it, and the old person's answer is not theirs. */
  useEffect(() => {
    setRead(readFlag(scope));
    setDue(false);
  }, [scope]);

  useEffect(() => {
    if (!enabled || !isAuthenticated || read) return;

    const timer = window.setTimeout(() => {
      /* Not while they are in another tab: it would be waiting for them
         behind whatever they came back to, with no sense of why, and this
         one does not close until it is read. */
      if (document.hidden) return;
      setDue(true);
    }, AFTER_MS);

    return () => window.clearTimeout(timer);
  }, [enabled, isAuthenticated, read]);

  const markRead = useCallback(() => {
    setRead(true);
    setDue(false);
    try {
      localStorage.setItem(`${KEY}:${scope}`, "1");
    } catch {
      /* The guide simply shows again next session. */
    }
  }, [scope]);

  return {
    /** It is opening itself right now, and must be read before it closes. */
    due,
    /** Nothing has been read yet, so the button is worth pointing at. */
    unread: enabled && isAuthenticated && !read,
    markRead,
  };
}
