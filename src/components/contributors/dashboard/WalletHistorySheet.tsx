import Wallet from "@solar-icons/react/money/Wallet";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Money } from "@/components/contributors/wallet/Money";
import {
  formatEntryDate,
  type Wallet as WalletData,
  type WalletEntry,
} from "@/data/contributors/wallet";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<WalletEntry["kind"], string> = {
  earned: "Earned",
  bonus: "Bonus",
  withdrawal: "Withdrawal",
  adjustment: "Adjustment",
};

/**
 * Every movement in the wallet.
 *
 * A bottom sheet rather than a page: it is a thing you check and dismiss, and
 * on a phone sliding it up over the dashboard keeps the balance you were just
 * looking at in mind.
 *
 * Money in is the accent, money out is plain — a ledger where withdrawals are
 * red reads as if taking your own earnings were a problem.
 */
export function WalletHistorySheet({
  open,
  onOpenChange,
  wallet,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: WalletData;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="max-h-[85vh] overflow-y-auto rounded-t-[28px] border-alva-border bg-alva-card px-4 pb-8 pt-7"
      >
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="text-xl text-foreground">Wallet history</SheetTitle>
          <p className="text-sm text-muted-foreground">
            <Money kobo={wallet.balanceKobo} /> available
            {wallet.pendingKobo > 0 ? (
              <>
                {" · "}
                <Money kobo={wallet.pendingKobo} /> on hold
              </>
            ) : null}
          </p>
        </SheetHeader>

        {wallet.entries.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-alva-surface">
              <Wallet size={22} weight="Outline" className="text-muted-foreground" />
            </span>
            <p className="mt-3 text-sm font-medium text-foreground">Nothing yet</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Your earnings appear here once a recording is approved.
            </p>
          </div>
        ) : (
          <ul className="mt-5">
            {wallet.entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 border-b border-alva-border/60 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{entry.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {KIND_LABEL[entry.kind]} · {formatEntryDate(entry.at)}
                  </p>
                </div>

                <Money
                  kobo={entry.amountKobo}
                  signed
                  className={cn(
                    "shrink-0 text-sm",
                    entry.amountKobo > 0 ? "text-alva-accent" : "text-foreground"
                  )}
                />
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
