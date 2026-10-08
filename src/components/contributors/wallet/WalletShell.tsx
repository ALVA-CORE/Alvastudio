import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The flap's silhouette.
 *
 * Straight across the top for most of its width, then a wide shallow scoop in
 * the middle so the card behind it stays readable, then straight down. The
 * bottom corners are left square here and clipped by the container's own
 * radius: drawing them in the path meant they stretched with
 * `preserveAspectRatio="none"` and stopped matching the back panel's corners.
 *
 * The scoop is deliberately shallow. A deep one reads as a bite taken out of
 * the leather; what it should read as is the natural sag of a pocket with
 * something in it.
 */
const FLAP_PATH = "M0 0H74C110 0 128 22 160 22C192 22 210 0 246 0H320V160H0Z";

/** One curve for both halves of the pull, so out and in feel like one move. */
const EASE = [0.32, 0.72, 0, 1] as const;

/**
 * How far the pocket reaches, and how much of it is flap.
 *
 * `TAIL` is the only thing below the card, so the wallet ends just under it
 * instead of trailing off. Both are fixed, which is why the card sets the
 * height rather than a magic number for the whole shell: a fixed shell left a
 * different amount of dead leather at every screen width, and on a narrow
 * phone that gap was most of the object.
 */
const FLAP_H = "h-[6.75rem]";
const TAIL = "pb-5";

/**
 * Transparent room above the flap for its own shadow to fall into.
 *
 * The flap clips to `rounded-b-2xl` so its bottom corners match the back
 * panel, and that same clip would cut the shadow off at the top edge, which is
 * the only edge the shadow is for. So the clipping box is taller than the
 * leather and the leather sits at the bottom of it.
 */
const FLAP_BOX = "h-[8.25rem]";

/** How long the card takes to come out, and to go back in. */
const PULL_MS = 420;
const TUCK_MS = 460;

/**
 * When, on the way in, the card drops behind the flap.
 *
 * Just past the top of its lift, so it rises clear of the leather and then
 * slides down behind it. Dropping at the start meant it never cleared the
 * pocket, which is the half of the move that makes it a pocket.
 */
const TUCK_HANDOFF_MS = 200;

/**
 * A card tucked into a wallet.
 *
 * Three layers sharing one bottom edge, stacked back to front: the back panel,
 * the card, then the flap covering the card's lower half.
 *
 * Back and flap are the same flat grey, with no stitching and no gradient.
 * Both were trying to make it look like leather, and both just drew lines
 * across a shape that already reads correctly from its silhouette alone.
 */
export function WalletShell({
  card,
  /** Sits on the flap, over the card's lower half. */
  flapContent,
  /** Pulls the card out of the pocket and leaves it resting on the flap. */
  pulled = false,
  className,
}: {
  card: ReactNode;
  flapContent?: ReactNode;
  pulled?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;

  /* A drawn card is in front of the whole pocket, the three actions on the
   * leather included, which is why this goes above their z-40 rather than
   * level with it. */
  const [above, setAbove] = useState(false);

  useEffect(() => {
    if (pulled) {
      setAbove(true);
      return;
    }
    if (reduced) {
      setAbove(false);
      return;
    }
    const timer = window.setTimeout(() => setAbove(false), TUCK_HANDOFF_MS);
    return () => window.clearTimeout(timer);
  }, [pulled, reduced]);

  return (
    <div className={cn("relative w-full", className)}>
      {/* 1 · Back panel */}
      <div
        aria-hidden
        className="absolute inset-0 z-10 rounded-2xl bg-alva-card"
      />

      {/* 2 · Card. In the flow, so it sets the height of the whole pocket. */}
      <motion.div
        className={cn("relative px-[4.5%] pt-3", TAIL)}
        style={{ zIndex: above ? 50 : 20 }}
        animate={pulled ? "out" : "in"}
        variants={
          reduced
            ? { in: { y: 0, scale: 1 }, out: { y: 0, scale: 1 } }
            : {
                /* Out: up clear of the dip, then down onto the leather. It
                   lands a little proud of where it started, so it reads as
                   sitting on the pocket rather than back inside it. */
                out: {
                  y: [0, -30, -14],
                  scale: [1, 1.04, 1.025],
                  transition: {
                    duration: PULL_MS / 1000,
                    times: [0, 0.55, 1],
                    ease: EASE,
                  },
                },
                /* In: the same move run backwards. It lifts clear of the flap
                   first and only then drops down behind it, so it goes into
                   the pocket instead of vanishing under it. */
                in: {
                  y: [-14, -32, 0],
                  scale: [1.025, 1.045, 1],
                  transition: {
                    duration: TUCK_MS / 1000,
                    times: [0, 0.4, 1],
                    ease: EASE,
                  },
                },
              }
        }
      >
        {card}
      </motion.div>

      {/* 3 · Flap, over the card's lower half */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-30 overflow-hidden rounded-b-2xl",
          FLAP_BOX
        )}
      >
        {/* `drop-shadow` rather than a box shadow: it follows the alpha of the
            shape, so the shadow traces the scoop instead of a rectangle. */}
        <svg
          className={cn(
            "absolute inset-x-0 bottom-0 block w-full text-alva-card",
            "drop-shadow-[0_-2px_5px_rgba(0,0,0,0.45)]",
            FLAP_H
          )}
          viewBox="0 0 320 160"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path fill="currentColor" d={FLAP_PATH} />
        </svg>
      </div>

      {/* 4 · Whatever sits on the flap */}
      {flapContent ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-start justify-center",
            FLAP_H
          )}
        >
          <div className="pointer-events-auto w-full">{flapContent}</div>
        </div>
      ) : null}
    </div>
  );
}
