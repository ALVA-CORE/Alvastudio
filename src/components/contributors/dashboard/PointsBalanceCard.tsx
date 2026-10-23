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
  /** From `/dashboard/contributor`. Null where `payment` is, e.g. for an intern. */
  milestone?: {
    clips_per_milestone: number;
    clips_to_next: number;
    amount_per_milestone: string;
    currency: string;
  } | null;
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
  milestone,
  className,
  isEmpty = false,
}: PointsBalanceCardProps) {
  const [face, setFace] = useState<"points" | "wallet">("points");
  const reduced = useReducedMotion() ?? false;

  const { wallet, reload: reloadWallet } = useWallet();
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

            {/* Points are not money. Money arrives in ₦5,000 steps, every 500
                approved clips, so the bar is what somebody actually wants to
                know: how far off the next one is. */}
            {milestone && milestone.clips_per_milestone > 0 ? (
              <div className="relative z-[1] mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-alva-bg/20">
                  <div
                    className="h-full rounded-full bg-alva-bg/70 transition-[width] duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          ((milestone.clips_per_milestone - milestone.clips_to_next) /
                            milestone.clips_per_milestone) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-alva-bg/75">
                  {milestone.clips_to_next} more approved{" "}
                  {milestone.clips_to_next === 1 ? "clip" : "clips"} to{" "}
                  {milestone.currency === "NGN" ? "₦" : `${milestone.currency} `}
                  {Number(milestone.amount_per_milestone).toLocaleString()}
                </p>
              </div>
            ) : null}

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
