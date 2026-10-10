import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LeaderboardPodium } from "@/components/contributors/dashboard/LeaderboardPodium";
import { WalletFace } from "@/components/contributors/wallet/WalletFace";
import { TextureButton } from "@/components/ui/texture-button";
import { alvaAccentTexture } from "@/lib/alva-texture";
import {
  setIdentityState,
  setPayoutAccount,
  useWalletFace,
} from "@/data/contributors/walletStore";
import { cn } from "@/lib/utils";

type PointsBalanceCardProps = {
  points: number;
  currentUserId?: string;
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
export function PointsBalanceCard({
  points,
  currentUserId,
  className,
  isEmpty = false,
}: PointsBalanceCardProps) {
  const [face, setFace] = useState<"points" | "wallet">("points");
  const reduced = useReducedMotion() ?? false;

  /* Shared, so verifying identity here is still verified on the profile. */
  const wallet = useWalletFace(isEmpty);
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
              onLinkAccount={setPayoutAccount}
              onVerifyIdentity={(identity) => setIdentityState(identity, isEmpty)}
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
                <p className="text-xs text-alva-bg/70">Points balance</p>
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
