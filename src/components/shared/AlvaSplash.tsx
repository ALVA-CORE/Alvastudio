import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlvaLogo } from "@/components/auth/AlvaLogo";

const WORDMARK = "Alvacore";

/** Per character. Fast enough to finish inside a slow boot, slow enough to read. */
const TYPE_MS = 70;

/** How long the glow takes to travel, in ms. Matched by the motion transition. */
const RISE_MS = 1500;
/** A breath on the finished lockup before the app replaces it. */
const SETTLE_MS = 420;

/**
 * Held while the session is being checked.
 *
 * **The glow is a circle, not a band.** `AlvaTopGlow` is three gradients
 * anchored to `top-0` with fixed `vh` heights — perfect where it lives,
 * because its bottom edge is the only one you ever see. Moved up the page it
 * showed its *top* edge too, and a gradient clipped flat across the screen
 * reads as a line sweeping past rather than a light source. So this draws its
 * own: one radial ellipse with no hard edge in any direction, which can be
 * anywhere on screen and still look like a glow.
 *
 * **It travels on a single transform.** `y` as a percentage of the element,
 * on one absolutely-positioned layer, so the browser composites it rather
 * than repainting three stacked gradients every frame — that juddering was
 * the "doesn't move smoothly".
 *
 * **It finishes before the app appears.** The glow arrives, the wordmark
 * lands, and only then does `onDone` fire. A loading screen that is cut off
 * mid-animation is worse than none: it reads as a glitch on the way in.
 *
 * **It waits before showing.** A boot check is usually one fast request, and
 * a splash that appears and vanishes inside 200ms is a flash, not a brand
 * moment. Nothing paints until the wait has proved itself slow.
 */
export function AlvaSplash({
  delayMs = 220,
  onStart,
  onDone,
}: {
  /** How long the wait has to last before anything is drawn. */
  delayMs?: number;
  /**
   * Called the moment anything is actually painted.
   *
   * The caller needs this, not just `onDone`. Knowing only when the
   * animation *ends* leaves no way to tell "it never started" apart from
   * "it is still running" — so a boot check finishing early looks like the
   * first, the gate lets go, and the splash is cut off mid-rise. Which is
   * exactly what happened.
   */
  onStart?: () => void;
  /**
   * Called once the animation has played out.
   *
   * The caller holds the app back until then, so the sequence is never cut
   * in half by a request that finished early.
   */
  onDone?: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const [shown, setShown] = useState(false);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  /* Announced from an effect rather than inside the timeout, so it cannot
     fire during a render the caller is in the middle of. */
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

  /* The whole sequence, then the handover. Reduced motion still waits a beat
     rather than flashing a finished lockup for one frame. */
  useEffect(() => {
    if (!shown || !onDone) return;

    const total = reduced ? SETTLE_MS : RISE_MS + SETTLE_MS;
    const timer = window.setTimeout(onDone, total);
    return () => window.clearTimeout(timer);
  }, [shown, reduced, onDone]);

  if (!shown) {
    /* The old behaviour, unchanged, for every boot fast enough not to need
       this screen: a tinted page so the wrong one is never painted. */
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
      {/* One layer, one transform. Taller and wider than the viewport so no
          edge of the ellipse can ever cross into frame. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[150dvh] w-[180vw] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse 40% 26% at 50% 34%," +
            "hsl(var(--alva-accent)/0.40) 0%," +
            "hsl(var(--alva-accent)/0.26) 22%," +
            "hsl(var(--alva-accent)/0.13) 42%," +
            "hsl(var(--alva-accent)/0.05) 62%," +
            "hsl(var(--alva-accent)/0.012) 80%," +
            "transparent 100%)",
        }}
        /* From low on the screen to where the page glow sits: the ellipse's
           centre ends just above the top edge, which is the shape every
           other page wears. */
        initial={reduced ? false : { y: "48%", opacity: 0.55 }}
        animate={{ y: "-24%", opacity: 1 }}
        transition={{ duration: RISE_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.div
        className="relative flex items-center justify-center gap-3 px-6"
        initial={reduced ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <AlvaLogo className="h-12 shrink-0 sm:h-14" />

        {/* The text node carries the name for assistive tech in full from the
            start — a screen reader should not be made to watch it type. */}
        <span className="flex items-baseline text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
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
