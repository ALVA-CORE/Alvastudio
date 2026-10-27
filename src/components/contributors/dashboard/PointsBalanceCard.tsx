import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LeaderboardPodium } from "@/components/contributors/dashboard/LeaderboardPodium";
import type { LeaderboardEntry } from "@/data/contributors/dashboard";
import { WalletFace } from "@/components/contributors/wallet/WalletFace";
import { TextureButton } from "@/components/ui/texture-button";
import { alvaAccentTexture } from "@/lib/alva-texture";
import { useWallet } from "@/data/contributors/walletStore";
import { cn } from "@/lib/utils";

type PointsBalanceCardProps = {
  points: number;
  currentUserId?: string;
  /** Null until they have enough recordings to be ranked. */
  rank?: number | null;
  rankedOf?: number;
  /** The live top three, already ordered second-first-third. */
  podium?: LeaderboardEntry[];
  className?: string;
  isEmpty?: boolean;
};

/**
 * Points and money, two faces of one object.
 *
 * They are the same question asked twice, "what has my recording been worth?",
 * so they take turns in one slot rather than both claiming the top of the
 * screen.
 *
 * The switch is a morph in place: one box stays mounted and springs between
 * the two heights while its contents cross-fade inside it. Nothing below it
 * jumps, because the box never leaves the flow and is never two boxes.
 *
 * `mode="popLayout"` is what buys that. Plain `AnimatePresence` keeps the
 * outgoing face in the flow until its exit finishes, so for those few hundred
 * milliseconds both faces are stacked and everything under them is shoved down
 * the page. `popLayout` lifts the outgoing face out of the flow the instant it
 * starts leaving, so the incoming one takes the slot immediately and the
 * container's `layout` spring is the only thing moving.
 *
 * A shared `layoutId` was the wrong tool here: it animates a box from where it
 * was to where it will be, and with both faces in the flow "where it will be"
 * was the bottom of the page.
 */
/** 1st, 2nd, 3rd, 4th. English, not a library. */
function ordinal(value: number) {
  const rest = value % 100;
  if (rest >= 11 && rest <= 13) return `${value}th`;
  return `${value}${["th", "st", "nd", "rd"][value % 10] ?? "th"}`;
}

export function PointsBalanceCard({
  points,
  currentUserId,
  rank = null,
  rankedOf = 0,
  podium = [],
  className,
  isEmpty = false,
}: PointsBalanceCardProps) {
  const [face, setFace] = useState<"points" | "wallet">("points");
  const reduced = useReducedMotion() ?? false;

  /* The one caller that watches: document review finishes without telling
     the page, and this is the card showing the wait. The nudges and the
     profile row read the same wallet and must not each run a timer. */
  const { wallet, reload: reloadWallet } = useWallet({ watch: true });
  const isWallet = face === "wallet";

  const formattedPoints = new Intl.NumberFormat("en-NG").format(points);

  /* The box's own height change. Firm enough to feel like the card has
   * weight, damped enough not to wobble past the new size. */
  const morph = reduced
    ? { duration: 0 }
    : ({ type: "spring", stiffness: 420, damping: 38, mass: 0.9 } as const);

  /* The swap inside it. Short, so the faces have traded by the time the box
   * has finished resizing around them. */
  const contents = reduced
    ? { duration: 0 }
    : ({ duration: 0.2, ease: [0.32, 0.72, 0, 1] } as const);

  return (
    <motion.div
      layout
      transition={morph}
      className={cn("relative mx-4", className)}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {isWallet ? (
          <motion.div
            key="wallet"
            initial={{ opacity: 0, scale: reduced ? 1 : 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduced ? 1 : 0.97 }}
            transition={contents}
          >
            <WalletFace
              wallet={wallet}
              onShowPoints={() => setFace("points")}
              onRefresh={reloadWallet}
            />
          </motion.div>
        ) : (
          <motion.section
            key="points"
            initial={{ opacity: 0, scale: reduced ? 1 : 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduced ? 1 : 0.97 }}
            transition={contents}
            className={alvaAccentTexture(
              "overflow-hidden rounded-2xl px-5 pb-0 pt-4"
            )}
          >
            <div className="relative z-[1] flex items-end justify-between gap-3">
              <div className="min-w-0">
                {/* Rank is the thing people actually look for, and it means
                  nothing without the field size: "4th" could be of five. */}
              <p className="text-xs text-alva-bg/70">
                {rank && rankedOf > 0
                  ? `${ordinal(rank)} of ${rankedOf}`
                  : "Points balance"}
              </p>
                <p className="mt-0.5 text-3xl font-semibold tracking-tight text-alva-bg">
                  {formattedPoints}
                  <span className="ml-1.5 text-lg font-medium text-alva-bg/75">
                    pts
                  </span>
                </p>
              </div>

              <TextureButton
                variant="primary"
                size="sm"
                className="w-auto shrink-0"
                onClick={() => setFace("wallet")}
              >
                Wallet
              </TextureButton>
            </div>


            <div className="relative z-[1]">
              {isEmpty ? (
                <p className="pb-4 pt-4 text-xs text-alva-bg/75">
                  Record your first prompt to start earning points and enter the
                  leaderboard.
                </p>
              ) : (
                <LeaderboardPodium
                  embedded
                  entries={podium}
                  currentUserId={currentUserId}
                  className="-mx-2 mt-4"
                />
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
