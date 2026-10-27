import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlvaLogo } from "@/components/auth/AlvaLogo";
import { AlvaTopGlow } from "@/components/shared/AlvaTopGlow";

const WORDMARK = "Alvacore";

/** Per character. Fast enough to finish inside a slow boot, slow enough to read. */
const TYPE_MS = 65;

/**
 * Held while the session is being checked.
 *
 * **The glow rises.** It starts low on the screen and travels to the top,
 * where `AlvaTopGlow` sits on every other page — so the splash does not cut
 * to the app, it *becomes* it. Nothing is duplicated to do this: it is the
 * same component, moved.
 *
 * **The group re-centres as it types.** The logo and the wordmark are one
 * centred flex row, so each character pushes the logo left by half its own
 * width. That is the whole effect — a mark that settles into a lockup rather
 * than a label appearing beside a static icon.
 *
 * **It waits before showing.** A boot check is usually one fast request, and
 * a splash that appears and vanishes inside 200ms is a flash, not a brand
 * moment. So nothing paints until the wait has proved itself slow; a quick
 * session check shows the tinted page it always did, and nobody sees this at
 * all. That is the right outcome — this screen exists to cover a wait, not
 * to create one.
 */
export function AlvaSplash({
  /** How long the wait has to last before anything is drawn. */
  delayMs = 220,
}: {
  delayMs?: number;
}) {
  const reduced = useReducedMotion() ?? false;
  const [shown, setShown] = useState(false);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

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
      <motion.div
        aria-hidden
        className="absolute inset-0"
        /* Of its own height, which is the viewport — so 82% leaves the
           brightest part of the gradient filling the bottom of the screen,
           and 0% is exactly where the glow sits on every other page. */
        initial={reduced ? false : { y: "82%", opacity: 0.75 }}
        animate={{ y: "0%", opacity: 1 }}
        transition={{ duration: 1.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <AlvaTopGlow />
      </motion.div>

      <motion.div
        className="relative flex items-center justify-center gap-3 px-6"
        initial={reduced ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
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
