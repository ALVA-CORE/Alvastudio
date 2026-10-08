import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import CashOut from "@solar-icons/react/money/CashOut";
import ClipboardList from "@solar-icons/react/notes/ClipboardList";
import CupStar from "@solar-icons/react/ui/CupStar";
import { BalanceCard } from "@/components/contributors/wallet/BalanceCard";
import { WalletShell } from "@/components/contributors/wallet/WalletShell";
import { LinkBankSheet } from "@/components/contributors/wallet/LinkBankSheet";
import { WalletHistorySheet } from "@/components/contributors/dashboard/WalletHistorySheet";
import { alvaToast } from "@/lib/alva-toast";
import { alvaDarkTexture } from "@/lib/alva-texture";
import {
  formatWalletNaira,
  type PayoutAccount,
  type Wallet,
} from "@/data/contributors/wallet";
import { cn } from "@/lib/utils";

/**
 * The wallet: a card in a pocket, with the three things you can do from here.
 *
 * The actions sit on the flap rather than under the wallet. A wallet with its
 * buttons floating below it is a picture of a wallet next to some buttons;
 * putting them on the leather makes the whole thing one object.
 *
 * There is no "Payout" button. It used to sit beside "Withdraw" and nobody
 * could say what the difference was, since one moved money and the other
 * changed where money goes, and both read as "get paid". The bank lives on the
 * card now, which is where a person looks for it: tap the card to link one,
 * tap it again to change it. The tap pulls the card up out of the pocket and
 * rests it on the flap before the sheet opens, so the sheet reads as the back
 * of the card you just drew rather than a panel that appeared.
 *
 * Closing the sheet leaves the card out. Putting it away by itself took back a
 * move the person made, and a drawn card is a perfectly good resting state:
 * the whole of it is readable, and tapping it again tucks it in.
 */

/** Long enough for the card to clear the dip, short enough not to be a wait. */
const PULL_MS = 320;
export function WalletFace({
  wallet,
  onLinkAccount,
  onShowPoints,
  className,
}: {
  wallet: Wallet;
  onLinkAccount: (account: PayoutAccount) => void;
  /** Turns the card back over. Lives here so all three verbs sit together. */
  onShowPoints: () => void;
  className?: string;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pulled, setPulled] = useState(false);

  const reduced = useReducedMotion() ?? false;
  const pullTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (pullTimer.current !== null) window.clearTimeout(pullTimer.current);
    },
    []
  );

  /* Tapping the card toggles it: out of the pocket and showing its back, or
   * away again. Reduced motion skips straight to the sheet, since the pull is
   * the whole point of the delay. */
  const toggleCard = () => {
    if (pulled) {
      setPulled(false);
      return;
    }
    if (reduced) {
      setLinkOpen(true);
      return;
    }
    setPulled(true);
    pullTimer.current = window.setTimeout(() => setLinkOpen(true), PULL_MS);
  };

  const linked = Boolean(wallet.payoutAccount);
  const canWithdraw = linked && wallet.balanceKobo > 0;

  return (
    <div className={cn("w-full", className)}>
      <WalletShell
        pulled={pulled}
        card={
          <BalanceCard
            balanceKobo={wallet.balanceKobo}
            account={wallet.payoutAccount}
            onClick={toggleCard}
          />
        }
        flapContent={
          /* Spread across the full width of the leather rather than spaced by
             a fixed gap, which ran the three labels into each other on a
             narrow phone. */
          <div className="flex w-full items-start justify-around px-4 pt-6">
            <WalletAction
              label="Withdraw"
              icon={<CashOut size={18} weight="Outline" />}
              disabled={!canWithdraw}
              hint={
                !linked
                  ? "Link a bank first"
                  : wallet.balanceKobo === 0
                    ? "Nothing to withdraw yet"
                    : undefined
              }
              onClick={() =>
                alvaToast.success(
                  `${formatWalletNaira(wallet.balanceKobo)} on the way`
                )
              }
            />
            <WalletAction
              label="History"
              icon={<ClipboardList size={18} weight="Outline" />}
              onClick={() => setHistoryOpen(true)}
            />
            <WalletAction
              label="Points"
              icon={<CupStar size={18} weight="Outline" />}
              onClick={onShowPoints}
            />
          </div>
        }
      />

      <LinkBankSheet
        open={linkOpen}
        onOpenChange={setLinkOpen}
        existing={wallet.payoutAccount}
        onLink={(account) => {
          onLinkAccount(account);
          alvaToast.success("Bank account linked");
        }}
      />

      <WalletHistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        wallet={wallet}
      />
    </div>
  );
}

function WalletAction({
  label,
  icon,
  onClick,
  disabled = false,
  hint,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** Why it is unavailable. Carried as the title, not as a third line. */
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? hint : undefined}
      className={cn(
        "group flex min-w-0 flex-col items-center gap-1.5 focus-visible:outline-none",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      {/* Textured disc on the darkest surface, the same face the accent
          buttons wear, so the three actions belong to the same kit as every
          other control. The glyph is small inside it: a tight fit made three
          buttons; a loose one makes three holes. */}
      <span
        className={alvaDarkTexture(
          cn(
            "flex size-11 items-center justify-center rounded-full text-foreground transition-colors",
            !disabled && "group-hover:text-alva-accent",
            "group-focus-visible:ring-2 group-focus-visible:ring-alva-accent"
          )
        )}
      >
        {/* Above the sheen, which is an absolutely positioned ::before. */}
        <span className="relative z-[1] flex">{icon}</span>
      </span>
      <span className="truncate text-[11px] text-muted-foreground">{label}</span>
    </button>
  );
}
