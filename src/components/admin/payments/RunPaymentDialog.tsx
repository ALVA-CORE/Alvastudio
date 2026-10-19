import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiPayRunPreview } from "@/lib/api/payouts";
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
 * A pay run is the one irreversible thing on the admin surface, so it is shown
 * in full first: how many people, how much in total, and how many are being
 * carried because they have not reached the minimum. Those last ones are the
 * reason this is a preview rather than a confirm — "38 people" and "38 people,
 * 4 of whom are being skipped" are different decisions.
 */
export function RunPaymentDialog({
  open,
  onOpenChange,
  preview,
  isRunning,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: ApiPayRunPreview | null;
  isRunning: boolean;
  onConfirm: () => void;
}) {
  const minimum = preview ? Number(preview.minimum_amount) : 0;
  const belowMinimum = (preview?.recipients ?? []).filter(
    (recipient) => Number(recipient.amount) < minimum
  ).length;

  const nothingToSend = preview != null && preview.recipient_count === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 overflow-hidden rounded-3xl border-alva-border bg-alva-card p-0">
        <DialogHeader className="shrink-0 border-b border-alva-border px-6 pb-4 pt-6 text-left">
          <DialogTitle className="text-xl text-foreground">Run payment</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {preview
              ? nothingToSend
                ? "Nothing has matured above the minimum yet, so a run would send nothing."
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
            <>
              {belowMinimum > 0 ? (
                <p className="mb-3 rounded-xl bg-alva-surface px-3 py-2.5 text-xs text-muted-foreground">
                  {belowMinimum} below the {naira(preview.minimum_amount)} minimum,
                  carried to the next run rather than paid.
                </p>
              ) : null}

              <dl>
                {preview.recipients.map((recipient) => (
                  <div
                    key={recipient.user_id}
                    className="flex items-baseline justify-between gap-3 border-b border-alva-border/50 py-2 last:border-0"
                  >
                    <dt className="min-w-0 truncate text-xs text-foreground">
                      {recipient.email}
                    </dt>
                    <dd className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {naira(recipient.amount)}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
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
            disabled={!preview || nothingToSend}
            loading={isRunning}
            onClick={onConfirm}
          >
            {preview && !nothingToSend
              ? `Send ${naira(preview.total_amount)}`
              : "Send"}
          </TextureButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
