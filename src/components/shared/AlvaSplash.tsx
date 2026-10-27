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
 * **It plays every time.** Every refresh, every first visit, signed in or
 * out. It is the way into the app rather than a progress indicator, so it
 * does not wait to find out whether there is anything to wait for.
 */
export function AlvaSplash({
  delayMs = 0,
  onStart,
  onDone,
}: {
  /**
   * How long the wait has to last before anything is drawn.
   *
   * **Zero now, on purpose.** It used to be 220ms so a fast boot never
   * flashed a splash it did not need — correct for a loading indicator, and
   * wrong for this, which is the way into the app. It should be the same on
   * every refresh and on a first visit, including a signed-out one where
   * there is no session to check at all. Kept as a parameter because the
   * threshold behaviour is still a sensible thing to want.
   */
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
      {/* One layer, one transform. Taller and wider than the viewport so no
          edge of the ellipse can ever cross into frame. */}
      <motion.div
        aria-hidden
        /**
         * A round blob, not a band.
         *
         * The previous one was an ellipse sized as a percentage of a layer
         * nearly three viewports wide, which made it ~350vw across and one
         * viewport tall. Horizontally that is flat, so all you could see was
         * its vertical falloff: a soft horizontal line sliding up the
         * screen. Making it bigger made it flatter.
         *
         * So it is a square box with a `circle` gradient, which cannot be
         * anything but round, sized in `vmin` so it stays round and stays
         * proportionate on a phone and on a monitor alike.
         *
         * Centred with `inset-x-0 mx-auto` and offset by half its height
         * with a margin. Never a translate: framer animates `y` by writing
         * `transform`, which replaces the whole property, and a centring
         * translate would be wiped the moment it started.
         */
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto size-[130vmin] rounded-full"
        style={{
          /* Half the height up, so `y` positions the blob's centre rather
             than its top edge and the numbers below mean what they say. */
          marginTop: "-65vmin",
          background:
            "radial-gradient(circle at 50% 50%," +
            "hsl(var(--alva-accent)/0.42) 0%," +
            "hsl(var(--alva-accent)/0.30) 18%," +
            "hsl(var(--alva-accent)/0.17) 34%," +
            "hsl(var(--alva-accent)/0.08) 50%," +
            "hsl(var(--alva-accent)/0.03) 66%," +
            "hsl(var(--alva-accent)/0.008) 82%," +
            "transparent 100%)",
        }}
        /* Centre starts low on the screen and finishes just above the top
           edge, which is where the glow sits on every other page. */
        initial={reduced ? false : { y: "78vh", opacity: 0.65 }}
        animate={{ y: "-6vh", opacity: 1 }}
        transition={{ duration: RISE_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.div
        className="relative flex items-center justify-center gap-2.5 px-6"
        initial={reduced ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <AlvaLogo className="h-8 shrink-0 sm:h-9" />

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
