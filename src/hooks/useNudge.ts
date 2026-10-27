import { useEffect, useState } from "react";

/**
 * A prompt that waits, then asks, then leaves them alone for a while.
 *
 * Two of these exist and they are the only two: verifying a NIN, which stops
 * somebody being paid, and asking for feedback. Both are interruptions, so
 * both have the same three rules.
 *
 * **It waits.** Nothing opens on arrival. A sheet over somebody's first
 * screen is a thing to dismiss, not to read, and it trains people to close
 * whatever appears.
 *
 * **It remembers, per browser.** `localStorage` is right for this: it is a
 * per-viewer convenience, nobody else needs to know, and losing it costs one
 * repeated prompt rather than any data.
 *
 * **It stops.** `done` turns it off for good; `quietFor` sets how long a
 * dismissal buys. A prompt that comes back the moment you close it is worse
 * than one that never asked.
 */
export function useNudge({
  key,
  after,
  quietFor,
  enabled,
  done,
}: {
  /** Namespaced per person by the caller, so two accounts on one laptop differ. */
  key: string;
  /** How long to leave them alone before the first ask, in ms. */
  after: number;
  /** How long a dismissal lasts, in ms. */
  quietFor: number;
  /** False while the answer is unknown — nothing fires until it is true. */
  enabled: boolean;
  /** They have done the thing. Never ask again. */
  done: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled || done) return;

    const last = read(key);
    if (last !== null && Date.now() - last < quietFor) return;

    const timer = window.setTimeout(() => {
      /* Not while they are in another tab: it would be waiting for them
         behind whatever they came back to, with no sense of why. */
      if (document.hidden) return;
      setOpen(true);
    }, after);

    return () => window.clearTimeout(timer);
  }, [key, after, quietFor, enabled, done]);

  return {
    open,
    /** Call on dismiss. Starts the quiet period. */
    dismiss: () => {
      write(key, Date.now());
      setOpen(false);
    },
    setOpen,
  };
}

function read(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? Number(raw) : null;
  } catch {
    /* Blocked storage: they get asked again next session, which is the
       failure worth having. */
    return null;
  }
}

function write(key: string, at: number) {
  try {
    localStorage.setItem(key, String(at));
  } catch {
    /* Nothing to do; the prompt simply does not stay dismissed. */
  }
}

export const MINUTES = 60_000;
export const DAYS = 24 * 60 * MINUTES;
