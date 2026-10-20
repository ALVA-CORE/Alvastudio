import { useEffect, useMemo, useState } from "react";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { AlvaCombobox } from "@/components/shared/AlvaCombobox";
import { TextureButton } from "@/components/ui/texture-button";
import { alvaFieldClass } from "@/lib/alva-form-styles";
import { listBanks, type ApiBank } from "@/lib/api/wallet";
import { linkPayoutAccount } from "@/data/contributors/walletStore";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";
import type { PayoutAccount } from "@/data/contributors/wallet";
import { cn } from "@/lib/utils";

const ACCOUNT_LENGTH = 10;

/**
 * Link the bank a contributor gets paid into.
 *
 * A bottom sheet with two fields, not a page with a wizard. The whole task is
 * "which bank, which number" — the name is not typed, it is *resolved* from
 * the number, because the one thing that must not go wrong here is money
 * landing in a stranger's account. Showing the name back is the confirmation
 * step, so there is no separate one.
 *
 * Nothing is saved until that name has come back.
 */
export function LinkBankSheet({
  open,
  onOpenChange,
  existing,
  onLinked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: PayoutAccount | null;
  /** Fired once the account is saved. The caller re-reads the wallet. */
  onLinked: () => void;
}) {
  const [bank, setBank] = useState("");
  const [banks, setBanks] = useState<ApiBank[]>([]);
  const [number, setNumber] = useState("");
  const [resolved, setResolved] = useState<string | null>(null);
  const [isResolving, setResolving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBank(existing?.bank ?? "");
    /* The stored number is a mask — the API returns the last four digits and
     * never the account — so there is nothing to prefill. Changing a bank
     * means typing the number again, which is also the safer default. */
    setNumber("");
    setResolved(existing?.accountName ?? null);
    setResolving(false);
  }, [open, existing]);

  const complete = bank !== "" && number.length === ACCOUNT_LENGTH;

  /* The bank list is the API's, not ours: a code we invented would be
   * rejected by name enquiry. Fetched when the sheet opens rather than held
   * on the dashboard. */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listBanks()
      .then((rows) => !cancelled && setBanks(rows))
      .catch(() => !cancelled && setBanks([]));
    return () => {
      cancelled = true;
    };
  }, [open]);

  /**
   * Name enquiry is the save.
   *
   * `POST /wallet/payout-destination` resolves the account name and stores the
   * destination in one call, so there is no "verify" step to press before
   * "save" — the name coming back IS the confirmation, and it has already been
   * written by the time it arrives.
   */
  useEffect(() => {
    if (!complete) {
      setResolved(null);
      return;
    }

    let cancelled = false;
    setResolving(true);
    setResolved(null);

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      linkPayoutAccount(bank, number)
        .then((destination) => {
          if (cancelled) return;
          setResolved(destination.account_name ?? "");
        })
        .catch((cause: unknown) => {
          if (cancelled) return;
          const message = reportApiError(cause, "Could not find that account.");
          if (message) alvaToast.error(message);
        })
        .finally(() => !cancelled && setResolving(false));
    }, 650);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [bank, number, complete]);

  const options = useMemo(
    () => banks.map((row) => ({ value: row.code, label: row.name })),
    [banks]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="max-h-[85vh] overflow-y-auto rounded-t-[28px] border-alva-border bg-alva-card px-4 pb-8 pt-7"
      >
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="text-xl text-foreground">
            {existing ? "Change payout account" : "Where should we pay you?"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div>
            <span className="block text-xs text-muted-foreground">Bank</span>
            {/* Typed, not scrolled. Nobody hunts for their bank in a list of
                nineteen, they type three letters. */}
            <AlvaCombobox
              aria-label="Bank"
              className="mt-1.5"
              value={bank}
              onValueChange={setBank}
              options={options}
              placeholder="Choose your bank"
              searchPlaceholder="Search banks"
              emptyMessage="No bank by that name"
            />
          </div>

          <div>
            <label
              htmlFor="account-number"
              className="block text-xs text-muted-foreground"
            >
              Account number
            </label>
            <Input
              id="account-number"
              inputMode="numeric"
              autoComplete="off"
              maxLength={ACCOUNT_LENGTH}
              value={number}
              onChange={(event) =>
                setNumber(event.target.value.replace(/\D/g, "").slice(0, ACCOUNT_LENGTH))
              }
              wrapperClassName="mt-1.5"
              className={cn(alvaFieldClass(), "tabular-nums tracking-[0.08em]")}
              placeholder="0123456789"
            />
          </div>

          {/* The resolved name is the confirmation — there is no second step. */}
          <div
            className={cn(
              "flex min-h-[3.25rem] items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors",
              resolved ? "bg-alva-accent/10" : "bg-alva-surface"
            )}
          >
            {resolved ? (
              <>
                <CheckCircle
                  size={18}
                  weight="Bold"
                  className="shrink-0 text-alva-accent"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {resolved}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Account name
                  </span>
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                {isResolving
                  ? "Checking the account…"
                  : "Pick a bank and enter 10 digits to see the account name"}
              </span>
            )}
          </div>
        </div>

        <TextureButton
          variant="alva"
          size="lg"
          className="mt-6"
          loading={isResolving}
          disabled={!resolved}
          onClick={() => {
            if (!resolved) return;
            onLinked();
            onOpenChange(false);
          }}
        >
          {existing ? "Save this account" : "Link account"}
        </TextureButton>
      </SheetContent>
    </Sheet>
  );
}
