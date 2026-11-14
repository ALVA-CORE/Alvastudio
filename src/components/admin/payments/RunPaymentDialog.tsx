import { useEffect, useState } from "react";
import CloseCircle from "@solar-icons/react/ui/CloseCircle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import { Skeleton } from "@/components/ui/skeleton";
import { BeamInput } from "@/components/auth/BeamInput";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { formatNairaAmount } from "@/data/admin/payments";
import { usePaymentTerms } from "@/hooks/usePaymentTerms";
import type { ApiPayRunPreview, ApiPayRunRecipient } from "@/lib/api/payouts";
import { cn } from "@/lib/utils";

/** Naira with at most two decimals, above 0, up to the API's ₦10,000,000. */
function validMinimum(text: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return false;
  const value = Number(text);
  return value > 0 && value <= 10_000_000;
}

/** What somebody needs before a run can pay them, besides the minimum. */
const NEEDS = ["their ID on file", "a linked bank", "Bachs setup finished"];

/**
 * What the next run would do, before anybody commits to it.
 *
 * The total leads, because it is the decision. Who it goes to follows, and
 * each person can be paid on their own, any day (13 Nov), while Send pays
 * everyone and stays Sundays-only. The minimum can be lowered for this run
 * only (14 Nov); the total, the fees and the list follow it, so what is shown
 * is what will be sent.
 */
export function RunPaymentDialog({
  open,
  onOpenChange,
  preview,
  isUpdating = false,
  isRunning,
  onConfirm,
  payingUserId,
  onPay,
  minimum,
  onMinimumChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: ApiPayRunPreview | null;
  /** A new preview is on its way, for a changed minimum. */
  isUpdating?: boolean;
  isRunning: boolean;
  onConfirm: () => void;
  /** The one row being paid on its own, if any. */
  payingUserId: string | null;
  onPay: (recipient: ApiPayRunRecipient) => void;
  /** This run's minimum in naira, or null for the usual one. */
  minimum: string | null;
  onMinimumChange: (minimum: string | null) => void;
}) {
  const [confirming, setConfirming] = useState<ApiPayRunRecipient | null>(null);
  const busy = isRunning || payingUserId !== null;
  const terms = usePaymentTerms();
  const usual = terms ? formatNairaAmount(String(terms.payout_minimum_kobo / 100)) : null;

  /* Typed here, sent once typing stops and only when valid. */
  const [draft, setDraft] = useState(minimum ?? "");
  const invalid = draft.trim() !== "" && !validMinimum(draft.trim());
  useEffect(() => {
    const text = draft.trim();
    if (text !== "" && !validMinimum(text)) return;
    const timer = window.setTimeout(() => onMinimumChange(text === "" ? null : text), 400);
    return () => window.clearTimeout(timer);
  }, [draft, onMinimumChange]);

  /* Nothing is kept: closing goes back to the usual minimum. */
  const close = (next: boolean) => {
    if (!next) {
      setDraft("");
      onMinimumChange(null);
    }
    onOpenChange(next);
  };

  /* Under about ₦1,000 the fee is a large share of each payout. */
  const feeMatters = minimum !== null && Number(minimum) < 1000;
  const nobody = preview !== null && preview.recipient_count === 0;
  const total = preview ? formatNairaAmount(preview.total_amount) : null;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[88vh] max-w-lg flex-col gap-0 overflow-hidden border-alva-border bg-alva-card p-0 [&>button]:hidden">
        <div className="relative shrink-0 px-6 pb-5 pt-6">
          <button
            type="button"
            aria-label="Close"
            onClick={() => close(false)}
            className="absolute right-5 top-5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            <CloseCircle size={22} weight="Outline" />
          </button>
          {/* No visible title: the total says what this is. Screen readers
              still get one. */}
          <DialogTitle className="sr-only">Run payment</DialogTitle>
          <DialogDescription className="sr-only">
            Who the next run pays, and how much.
          </DialogDescription>

          {/* The total is the decision, so it leads. */}
          <div className={cn("pr-8 transition-opacity", isUpdating && "opacity-50")}>
            {!preview ? (
              <>
                <Skeleton className="h-3 w-28 rounded-full bg-alva-surface" />
                <Skeleton className="mt-3 h-9 w-44 rounded-xl bg-alva-surface" />
                <Skeleton className="mt-3 h-3 w-36 rounded-full bg-alva-surface" />
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  To {preview.recipient_count.toLocaleString()}{" "}
                  {preview.recipient_count === 1 ? "contributor" : "contributors"}
                </p>
                <p className="mt-1 font-display text-4xl font-semibold tabular-nums tracking-tight text-alva-accent">
                  {total}
                </p>
                <p
                  className={cn(
                    "mt-1.5 text-xs tabular-nums",
                    feeMatters ? "font-medium text-amber-300" : "text-muted-foreground"
                  )}
                >
                  + {formatNairaAmount(preview.total_bank_fee_cover)} bank fees
                </p>
              </>
            )}
          </div>

          <div className="mt-5">
            <BeamInput
              label="Minimum payout"
              prefix="₦"
              inputMode="decimal"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-invalid={invalid}
              className="tabular-nums"
            />
            {invalid ? (
              <p role="alert" className="mt-2 text-xs text-destructive">
                A number above 0, with at most two decimals.
              </p>
            ) : minimum !== null && usual ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Below the usual {usual}, for this run only.
              </p>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "alva-thin-scrollbar min-h-0 flex-1 overflow-y-auto px-3 transition-opacity",
            isUpdating && "opacity-50"
          )}
        >
          {!preview ? (
            <div className="space-y-2 px-3">
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={row} className="h-10 w-full rounded-xl bg-alva-surface" />
              ))}
            </div>
          ) : nobody ? (
            <div className="px-3 py-6">
              <p className="text-sm text-foreground">Nobody can be paid yet</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Each person needs{" "}
                {[...NEEDS, `${formatNairaAmount(preview.minimum_amount)} approved before this Sunday`].join(
                  ", "
                )}
                .
              </p>
            </div>
          ) : (
            <ul>
              {preview.recipients.map((recipient) => {
                const paying = payingUserId === recipient.user_id;
                return (
                  <li
                    key={recipient.user_id}
                    className="flex items-center gap-3 border-b border-alva-border/60 px-3 py-3 last:border-0"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">
                        {recipient.email}
                      </span>
                      <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
                        {formatNairaAmount(recipient.amount)}
                      </span>
                    </span>
                    <TextureButton
                      variant="minimal"
                      size="sm"
                      className="w-auto shrink-0"
                      loading={paying}
                      disabled={busy && !paying}
                      onClick={() => setConfirming(recipient)}
                    >
                      Pay
                    </TextureButton>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="shrink-0 px-6 pb-6 pt-4">
          <TextureButton
            variant="alva"
            size="lg"
            disabled={!preview || nobody || payingUserId !== null}
            loading={isRunning}
            onClick={onConfirm}
          >
            {preview && !nobody ? `Send ${total}` : "Send"}
          </TextureButton>
        </div>
      </DialogContent>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(next) => !next && setConfirming(null)}
        title={
          confirming ? `Pay ${confirming.email} ${formatNairaAmount(confirming.amount)} now?` : ""
        }
        description={`Alva also pays Bachs's bank fee, ${formatNairaAmount(preview?.bank_fee_cover ?? "0")}, on top. This cannot be cancelled.`}
        confirmLabel="Pay now"
        onConfirm={() => {
          if (confirming) onPay(confirming);
          setConfirming(null);
        }}
      />
    </Dialog>
  );
}
