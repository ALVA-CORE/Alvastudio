import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlvaLogo } from "@/components/auth/AlvaLogo";
import { AlvaTopGlow } from "@/components/shared/AlvaTopGlow";

const WORDMARK = "Alvacore";

/** Per character. Fast enough to finish inside a slow boot, slow enough to read. */
const TYPE_MS = 70;

/** A breath on the finished lockup before the app replaces it. */
const SETTLE_MS = 500;

/** The whole sequence, for the caller holding the app behind it. */
const TOTAL_MS = WORDMARK.length * TYPE_MS + SETTLE_MS;

/**
 * Held while the session is being checked.
 *
 * **The glow is the one from the sign-in pages**, in the place it sits
 * there, not moving. It was a travelling blob for a while: the idea was
 * that the splash would become the app rather than cut to it. In practice a
 * large soft shape sliding up the screen reads as something loading badly,
 * and matching the page somebody is about to land on does the same job
 * without the spectacle. `AlvaTopGlow` is used directly, so the two cannot
 * drift apart.
 *
 * **The group re-centres as it types.** The logo and the wordmark are one
 * centred flex row, so each character pushes the logo left by half its own
 * width. That is the whole effect: a mark settling into a lockup rather
 * than a label appearing beside a static icon.
 *
 * **It plays every time**, refresh or first visit, signed in or out. It is
 * the way into the app rather than a progress indicator, so it does not
 * wait to find out whether there is anything to wait for.
 */
export function AlvaSplash({
  delayMs = 0,
  onStart,
  onDone,
}: {
  /**
   * How long the wait has to last before anything is drawn.
   *
   * Zero by default. Kept as a parameter because a threshold is still a
   * sensible thing to want from a loading screen; it is just not what this
   * one is for.
   */
  delayMs?: number;
  /**
   * Called the moment anything is actually painted.
   *
   * The caller needs this, not just `onDone`. Knowing only when the
   * sequence *ends* leaves no way to tell "it never started" apart from
   * "it is still running".
   */
  onStart?: () => void;
  /** Called once the sequence has played out, so the caller can hand over. */
  onDone?: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const [shown, setShown] = useState(false);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  useEffect(() => {
    if (shown) onStart?.();
  }, [shown, onStart]);

  /* Reduced motion gets the finished lockup, not a faster version of the
     animation. The point of the preference is no movement, and a wordmark
     assembling itself quickly is still a wordmark assembling itself. */
  useEffect(() => {
    if (!shown) return;
    if (reduced) {
      setTyped(WORDMARK.length);
      return;
    }

    const timer = window.setInterval(() => {
      setTyped((count) => {
        if (count >= WORDMARK.length) {
          window.clearInterval(timer);
          return count;
        }
        return count + 1;
      });
    }, TYPE_MS);

    return () => window.clearInterval(timer);
  }, [shown, reduced]);

  useEffect(() => {
    if (!shown || !onDone) return;

    const timer = window.setTimeout(onDone, reduced ? SETTLE_MS : TOTAL_MS);
    return () => window.clearTimeout(timer);
  }, [shown, reduced, onDone]);

  if (!shown) {
    /* Only reachable when a caller passes a threshold. A tinted page, so the
       wrong screen is never painted underneath. */
    return <div className="min-h-dvh bg-alva-bg" aria-busy="true" />;
  }

  const done = typed >= WORDMARK.length;

  return (
    <div
      className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-alva-bg"
      role="status"
      aria-busy="true"
      aria-label="Loading Alvacore"
    >
      <AlvaTopGlow />

      <motion.div
        className="relative flex items-center justify-center gap-2 px-6"
        initial={reduced ? false : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {/* Sized to the wordmark's cap height, not to the screen. A mark
            taller than the word beside it reads as an icon with a caption. */}
        <AlvaLogo className="h-6 shrink-0 sm:h-7" />

        {/* The text node carries the name for assistive tech in full from the
            start — a screen reader should not be made to watch it type. */}
        <span className="flex items-baseline text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          <span aria-hidden>{WORDMARK.slice(0, typed)}</span>
          <span className="sr-only">{WORDMARK}</span>

          {/* The caret only exists while something is being typed. Left to
              blink afterwards it reads as a text field waiting for input. */}
          {!done && !reduced ? (
            <motion.span
              aria-hidden
              className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.1em] bg-alva-accent"
              animate={{ opacity: [1, 0.15, 1] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : null}
        </span>
      </motion.div>
    </div>
  );
}
