import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { TextureButton } from "@/components/ui/texture-button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { ApiPayRunPreview, ApiPayRunRecipient } from "@/lib/api/payouts";
import { NO_VALUE } from "@/lib/no-value";

function naira(amount: string) {
  const value = Number(amount);
  return Number.isFinite(value)
    ? value.toLocaleString("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 2,
      })
    : NO_VALUE;
}

/**
 * What the next run would do, before anybody commits to it.
 *
 * Moving money cannot be undone, so who and how much are shown in full first.
 * Everyone listed can be paid in full now; each row can also be paid on its
 * own, any day (13 Nov), while Send pays them all and stays Sundays-only.
 */
export function RunPaymentDialog({
  open,
  onOpenChange,
  preview,
  isRunning,
  onConfirm,
  payingUserId,
  onPay,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: ApiPayRunPreview | null;
  isRunning: boolean;
  onConfirm: () => void;
  /** The one row being paid on its own, if any. */
  payingUserId: string | null;
  onPay: (recipient: ApiPayRunRecipient) => void;
}) {
  const [confirming, setConfirming] = useState<ApiPayRunRecipient | null>(null);
  const busy = isRunning || payingUserId !== null;

  const nothingToSend = preview != null && preview.recipient_count === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 overflow-hidden rounded-3xl border-alva-border bg-alva-card p-0">
        <DialogHeader className="shrink-0 border-b border-alva-border px-6 pb-4 pt-6 text-left">
          <DialogTitle className="text-xl text-foreground">Run payment</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {preview
              ? nothingToSend
                ? `Nobody can be paid yet. Each person needs their ID on file, a linked bank, Bachs setup finished, and ${naira(preview.minimum_amount)} or more approved before this Sunday.`
                : `${preview.recipient_count} contributors, ${naira(preview.total_amount)} in total.`
              : "Working out who would be paid."}
          </DialogDescription>
        </DialogHeader>

        <div className="alva-thin-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {!preview ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={row} className="h-9 w-full rounded-xl bg-alva-surface" />
              ))}
            </div>
          ) : (
            <dl>
              {preview.recipients.map((recipient) => (
                <div
                  key={recipient.user_id}
                  className="flex items-center justify-between gap-3 border-b border-alva-border/50 py-2 last:border-0"
                >
                  <dt className="min-w-0 truncate text-xs text-foreground">
                    {recipient.email}
                  </dt>
                  <dd className="flex shrink-0 items-center gap-3">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {naira(recipient.amount)}
                    </span>
                    <TextureButton
                      variant="minimal"
                      size="sm"
                      className="w-auto"
                      loading={payingUserId === recipient.user_id}
                      disabled={busy && payingUserId !== recipient.user_id}
                      onClick={() => setConfirming(recipient)}
                    >
                      Pay
                    </TextureButton>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-alva-border px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            Cancel
          </button>
          <TextureButton
            variant="alva"
            size="sm"
            className="w-auto"
            disabled={!preview || nothingToSend || payingUserId !== null}
            loading={isRunning}
            onClick={onConfirm}
          >
            {preview && !nothingToSend
              ? `Send ${naira(preview.total_amount)}`
              : "Send"}
          </TextureButton>
        </div>
      </DialogContent>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(next) => !next && setConfirming(null)}
        title={confirming ? `Pay ${confirming.email} ${naira(confirming.amount)} now?` : ""}
        description="Alva also pays Bachs's bank fee, about ₦100, on top. This cannot be cancelled."
        confirmLabel="Pay now"
        onConfirm={() => {
          if (confirming) onPay(confirming);
          setConfirming(null);
        }}
      />
    </Dialog>
  );
}
