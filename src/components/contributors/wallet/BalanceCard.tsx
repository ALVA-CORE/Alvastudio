import { CardBackdrop } from "@/components/contributors/wallet/CardBackdrop";
import { Money } from "@/components/contributors/wallet/Money";
import { type PayoutAccount } from "@/data/contributors/wallet";
import { cn } from "@/lib/utils";

/** Card proportions, same as the plastic in anyone's pocket. */
const ASPECT = "aspect-[320/201]";

function groupDigits(value: string) {
  return value.replace(/\D/g, "").match(/.{1,4}/g)?.join(" ") ?? value;
}

/**
 * The card in the wallet.
 *
 * Always the house accent, never the bank's colour. A card that changes
 * palette when an account is linked makes the product look like it belongs to
 * whoever you bank with, and it breaks the one-accent rule everything else on
 * this surface follows. The bank is named on the card instead, which is enough
 * to recognise it by.
 *
 * The balance stays on the card in both states, because that is the number a
 * contributor opened the wallet for.
 */
export function BalanceCard({
  balanceKobo,
  account,
  onClick,
  className,
}: {
  balanceKobo: number;
  account: PayoutAccount | null;
  onClick?: () => void;
  className?: string;
}) {
  const linked = Boolean(account);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        linked
          ? `Paid into ${account?.bank}, ${account?.accountNumber}. Tap to change.`
          : "No bank linked. Tap to add one."
      }
      className={cn(
        ASPECT,
        "relative block w-full overflow-hidden rounded-2xl bg-alva-accent p-4 text-left",
        "shadow-[0_10px_24px_-6px_rgba(0,0,0,0.65),0_2px_6px_rgba(0,0,0,0.4)]",
        "transition-transform duration-200 ease-out active:scale-[0.985]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alva-bg",
        className
      )}
    >
      <CardBackdrop className="absolute inset-0" />

      <span className="relative z-[1] flex h-full flex-col justify-between text-alva-bg">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-xs text-alva-bg/70">
              Wallet balance
            </span>
            <Money
              kobo={balanceKobo}
              className="mt-1 block truncate text-2xl font-semibold tracking-tight"
            />
          </span>

          {/* The mark sits where a scheme logo would, bare. A disc behind it
              read as a sticker stuck on the card; a shadow instead lifts it
              off the field without drawing a shape around it. */}
          <img
            src="/assets/logos/favicon.svg"
            alt=""
            aria-hidden
            className="size-8 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
          />
        </span>

        <span className="mt-auto block">
          {linked ? (
            <>
              <span className="block font-mono text-sm tabular-nums tracking-[0.2em] text-alva-bg">
                {groupDigits(account!.accountNumber)}
              </span>
              <span className="mt-1 flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[11px] font-semibold text-alva-bg/85">
                  {account!.accountName}
                </span>
                <span className="shrink-0 truncate text-[11px] font-semibold text-alva-bg/85">
                  {account!.bank}
                </span>
              </span>
            </>
          ) : (
            <span className="block text-[11px] text-alva-bg/70">
              Tap to add the account you want to be paid into
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
