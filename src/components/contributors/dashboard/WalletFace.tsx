import CashOut from "@solar-icons/react/money/CashOut";
import CardTransfer from "@solar-icons/react/money/CardTransfer";
import ClipboardList from "@solar-icons/react/notes/ClipboardList";
import type { ReactNode } from "react";
import { formatWalletNaira, type Wallet } from "@/data/contributors/wallet";
import { cn } from "@/lib/utils";

/**
 * The wallet's body — what sits under the balance once the card has flipped.
 *
 * Three round actions on a dark floor, which is the shape the reference uses
 * and the reason it reads as a wallet rather than another dashboard tile: a
 * balance with nothing to do about it is a statistic, not money.
 *
 * "Top up" is deliberately not one of them. A contributor never puts money
 * in — they earn it and take it out — so the three are getting paid, choosing
 * where it lands, and checking the maths.
 */
export function WalletFace({
  wallet,
  onWithdraw,
  onPayoutAccount,
  onHistory,
  className,
}: {
  wallet: Wallet;
  onWithdraw: () => void;
  onPayoutAccount: () => void;
  onHistory: () => void;
  className?: string;
}) {
  const canWithdraw = wallet.balanceKobo > 0;

  return (
    <div className={cn("rounded-2xl bg-alva-bg px-4 pb-4 pt-4", className)}>
      <div className="flex items-start justify-around gap-2">
        <WalletAction
          label="Withdraw"
          icon={<CashOut size={20} weight="Outline" />}
          onClick={onWithdraw}
          disabled={!canWithdraw}
        />
        <WalletAction
          label="Payout"
          icon={<CardTransfer size={20} weight="Outline" />}
          onClick={onPayoutAccount}
        />
        <WalletAction
          label="History"
          icon={<ClipboardList size={20} weight="Outline" />}
          onClick={onHistory}
        />
      </div>

      {/* The two numbers a contributor asks for next: what is still on hold,
          and what they have made in total. */}
      <dl className="mt-4 flex items-center justify-between gap-3 border-t border-alva-border pt-3">
        <div className="min-w-0">
          <dt className="text-[11px] text-muted-foreground">On hold</dt>
          <dd className="mt-0.5 truncate text-sm tabular-nums text-foreground">
            {formatWalletNaira(wallet.pendingKobo)}
          </dd>
        </div>

        <span aria-hidden className="h-7 w-px shrink-0 bg-alva-border" />

        <div className="min-w-0 text-right">
          <dt className="text-[11px] text-muted-foreground">Earned all time</dt>
          <dd className="mt-0.5 truncate text-sm tabular-nums text-foreground">
            {formatWalletNaira(wallet.lifetimeKobo)}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {wallet.payoutAccount
          ? `Paid to ${wallet.payoutAccount.bank} ${wallet.payoutAccount.masked}`
          : "Add a bank account to get paid"}
      </p>
    </div>
  );
}

function WalletAction({
  label,
  icon,
  onClick,
  disabled = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-3 py-1 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-alva-card text-foreground transition-colors group-hover:bg-alva-surface">
        {icon}
      </span>
      <span className="truncate text-xs text-muted-foreground">{label}</span>
    </button>
  );
}
