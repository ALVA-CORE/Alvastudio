import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { WalletCard, type CardTone } from "@/components/contributors/wallet/WalletCard";
import { cn } from "@/lib/utils";

export type StackCard = {
  id: CardTone;
  label: string;
  caption?: string;
  kobo: number;
};

/* ---------------------------------------------------------------------------
 * Stack tuning
 *
 * `PEEK_REM` is how much of each card behind shows above the one in front.
 * `INSET_REM` is how much narrower each one is on each side.
 *
 * The cards behind rise out of the top of the wallet rather than inside it.
 * Giving the pocket headroom for them made the whole tile taller and the
 * wallet stopped looking like a wallet with cards in it.
 * ------------------------------------------------------------------------- */
/* Short on purpose. At 0.85 the back card cleared the top of the tile and ran
 * under the fixed header, where it could not be tapped at all. */
export const PEEK_REM = 0.6;
const INSET_REM = 0.55;

/** How far the front card rises out of the pocket when it is tapped. */
const PULL_REM = 2.6;

/**
 * Where the cards sit in the wallet's stacking order.
 *
 * The shell lays out three bands: back panel at 10, flap at 30, the buttons on
 * it at 40. Resting cards go between the panel and the flap so the leather
 * still covers their lower half; a drawn one goes above everything, because
 * clearing the flap is the whole point of drawing it.
 */
const RESTING_Z = 20;
const DRAWN_Z = 50;

/** Card proportions, so the group can reserve the right height. */
const ASPECT = "aspect-[320/201]";

/**
 * The wallet's cards, stacked.
 *
 * A contributor's money is in four buckets and only one of them can be
 * withdrawn, so a single balance invites them to tap Withdraw on money that is
 * not theirs yet. Four cards say it without a paragraph: what you can take,
 * what is waiting on review, what is already on its way, and what has gone.
 *
 * The ones behind are narrower as well as higher, which is what makes it read
 * as a stack rather than as four cards in a list. Tapping one brings it
 * forward to full width and pushes the rest back.
 *
 * Tapping the one already in front draws it out of the pocket instead, and
 * tapping it again puts it back. That is the move the wallet is built around:
 * the flap covers the card's lower half, so a card you want to read properly
 * is a card you pull out.
 *
 * Opening the bank sheet is not on the card any more. A card you tap to open a
 * form cannot also be a card you shuffle, so linking an account moved to the
 * Payout button on the flap.
 */
export function CardStack({
  cards,
  pulled = false,
  onPulledChange,
  className,
}: {
  cards: StackCard[];
  /** Whether the front card is drawn. The shell needs it for z-order. */
  pulled?: boolean;
  onPulledChange?: (pulled: boolean) => void;
  className?: string;
}) {
  const [frontId, setFrontId] = useState<CardTone>(cards[0]?.id ?? "available");
  const reduced = useReducedMotion() ?? false;

  /* Front first, then the rest in their given order. Reordering this list
   * rather than the DOM keeps each card's own element, so framer animates the
   * one that moved instead of cross-fading two. */
  const ordered = [
    ...cards.filter((card) => card.id === frontId),
    ...cards.filter((card) => card.id !== frontId),
  ];

  const spring = reduced
    ? { duration: 0 }
    : ({ type: "spring", stiffness: 380, damping: 34, mass: 0.8 } as const);

  return (
    <div className={cn("relative w-full", className)}>
      {/* Reserves the height of the widest card, so the pocket wraps the
          group rather than collapsing behind absolutely positioned cards. */}
      <div aria-hidden className={cn(ASPECT, "invisible w-full")} />

      {cards.map((card) => {
        const depth = ordered.findIndex((item) => item.id === card.id);
        const isFront = depth === 0;

        return (
          <motion.button
            key={card.id}
            type="button"
            onClick={() => {
              if (isFront) {
                onPulledChange?.(!pulled);
                return;
              }
              onPulledChange?.(false);
              setFrontId(card.id);
            }}
            aria-label={
              isFront
                ? `${card.label}. ${pulled ? "Put back" : "Pull out"}.`
                : `${card.label}. Bring to front.`
            }
            aria-pressed={isFront}
            initial={false}
            animate={{
              top: `${-depth * PEEK_REM - (isFront && pulled ? PULL_REM : 0)}rem`,
              left: `${depth * INSET_REM}rem`,
              right: `${depth * INSET_REM}rem`,
              /* The shell's card slot deliberately sets no z-index of its
                 own, so these compete with the flap directly rather than
                 being trapped in one stacking context that drags the whole
                 stack over the leather whenever any card is drawn. */
              zIndex: isFront && pulled ? DRAWN_Z : RESTING_Z - depth,
            }}
            transition={spring}
            className="absolute rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alva-accent"
          >
            <WalletCard
              label={card.label}
              caption={isFront ? card.caption : undefined}
              kobo={card.kobo}
              tone={card.id}
              /* One renderer, on the only card anyone is reading. Four WebGPU
                 contexts for three cards showing a 7mm strip is three
                 renderers nobody asked for. */
              field={isFront}
            />
          </motion.button>
        );
      })}
    </div>
  );
}
