import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LeaderboardPodium } from "@/components/contributors/dashboard/LeaderboardPodium";
import { WalletFace } from "@/components/contributors/dashboard/WalletFace";
import { WalletHistorySheet } from "@/components/contributors/dashboard/WalletHistorySheet";
import { TextureButton } from "@/components/ui/texture-button";
import { alvaAccentTexture } from "@/lib/alva-texture";
import { alvaToast } from "@/lib/alva-toast";
import {
  EMPTY_WALLET,
  MOCK_WALLET,
  formatWalletNaira,
} from "@/data/contributors/wallet";
import { cn } from "@/lib/utils";

type PointsBalanceCardProps = {
  points: number;
  currentUserId?: string;
  className?: string;
  isEmpty?: boolean;
};

/**
 * Points and money, on two faces of one card.
 *
 * They are the same question asked twice — "what has my recording been
 * worth?" — so they share a card rather than competing for the top of the
 * screen. The accent band stays put through the flip and only its figure
 * changes, which is what makes the two read as one object turning over rather
 * than two cards swapping.
 *
 * Height is animated rather than snapped: the wallet face is taller than the
 * podium, and a card that jumps shoves the whole page down mid-tap.
 */
export function PointsBalanceCard({
  points,
  currentUserId,
  className,
  isEmpty = false,
}: PointsBalanceCardProps) {
  const [face, setFace] = useState<"points" | "wallet">("points");
  const [historyOpen, setHistoryOpen] = useState(false);
  const reduced = useReducedMotion() ?? false;

  const wallet = isEmpty ? EMPTY_WALLET : MOCK_WALLET;
  const isWallet = face === "wallet";

  const formattedPoints = new Intl.NumberFormat("en-NG").format(points);
  const swap = { duration: reduced ? 0 : 0.26, ease: [0.32, 0.72, 0, 1] as const };

  return (
    <>
      <motion.section
        layout={!reduced}
        transition={swap}
        className={cn(
          alvaAccentTexture("mx-4 overflow-hidden rounded-2xl px-5 pb-0 pt-4"),
          className
        )}
      >
        <div className="relative z-[1] flex items-end justify-between gap-3">
          <div className="min-w-0">
            {/* The label and figure cross-fade in place; the slot does not
                move, so the eye stays on the number through the change. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={face}
                initial={{ opacity: 0, y: reduced ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduced ? 0 : -6 }}
                transition={swap}
              >
                <p className="text-xs text-alva-bg/70">
                  {isWallet ? "Wallet balance" : "Points balance"}
                </p>
                <p className="mt-0.5 text-3xl font-semibold tracking-tight text-alva-bg">
                  {isWallet ? (
                    formatWalletNaira(wallet.balanceKobo)
                  ) : (
                    <>
                      {formattedPoints}
                      <span className="ml-1.5 text-lg font-medium text-alva-bg/75">
                        pts
                      </span>
                    </>
                  )}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <TextureButton
            variant="primary"
            size="sm"
            className="w-auto shrink-0"
            onClick={() => setFace(isWallet ? "points" : "wallet")}
          >
            {isWallet ? "Points" : "Wallet"}
          </TextureButton>
        </div>

        <motion.div layout={!reduced} transition={swap} className="relative z-[1]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={face}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={swap}
            >
              {isWallet ? (
                <WalletFace
                  className="mt-4 -mx-5 mb-0 rounded-b-none"
                  wallet={wallet}
                  onWithdraw={() =>
                    alvaToast.success(
                      `${formatWalletNaira(wallet.balanceKobo)} on its way to your bank`
                    )
                  }
                  onPayoutAccount={() =>
                    alvaToast.show("Payout account coming soon", { variant: "default" })
                  }
                  onHistory={() => setHistoryOpen(true)}
                />
              ) : isEmpty ? (
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
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.section>

      <WalletHistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        wallet={wallet}
      />
    </>
  );
}
