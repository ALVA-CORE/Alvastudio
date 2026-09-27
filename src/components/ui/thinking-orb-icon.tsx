import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ThinkingOrb } from "thinking-orbs";
import { cn } from "@/lib/utils";

/** The design we draw, before scaling. */
const PRESET = 64;

/**
 * The library ships exactly two tuned designs, 20 and 64, and they are
 * different drawings rather than one scaled: 64 carries more dots and its own
 * speed. Anything in between has to be one of them resized.
 *
 * This takes the 64 and scales it *down*. A 20 blown up to 28 is drawn at 20
 * CSS px and stretched, which is soft; a 64 shown at 28 is drawn at 64 and
 * downsampled, which is sharp, and keeps the denser design.
 *
 * It animates on a canvas, which means a rAF for as long as it is mounted, so
 * it stops when it is off screen or the tab is hidden, and `active` lets a
 * caller hold it as well.
 *
 * Ported from alvacore-landing-page without the `next/dynamic` wrapper — this
 * app has no SSR, so the canvas can be imported directly.
 */
export function ThinkingOrbIcon({
  active = true,
  px = 28,
  theme = "dark",
  className,
}: {
  active?: boolean;
  /** Rendered size in CSS px. See the note on `PRESET` above. */
  px?: number;
  /** `dark` draws light ink, `light` draws dark ink. Match the surface. */
  theme?: "dark" | "light";
  className?: string;
}) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    io.observe(el);

    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <span
      ref={hostRef}
      aria-hidden
      className={cn("block shrink-0", className)}
      style={{ width: px, height: px }}
    >
      <span
        className="block origin-top-left"
        style={{ width: PRESET, height: PRESET, scale: `${px / PRESET}` }}
      >
        <ThinkingOrb
          state="composing"
          size={PRESET}
          theme={theme}
          paused={reduced || !active || !onScreen || !pageVisible}
        />
      </span>
    </span>
  );
}
