import type { ReactNode } from "react";
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
  className,
}: {
  card: ReactNode;
  flapContent?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full", className)}>
      {/* 1 · Back panel */}
      <div
        aria-hidden
        className="absolute inset-0 z-10 rounded-2xl bg-alva-card"
      />

      {/* 2 · Cards. In the flow, so they set the height of the whole pocket.
          No z-index here on purpose: `position: relative` with `z-index: auto`
          creates no stacking context, so each card can rank itself against the
          flap. Setting one here lifted all four whenever any one was drawn. */}
      <div className={cn("relative px-[4.5%] pt-3", TAIL)}>{card}</div>

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
