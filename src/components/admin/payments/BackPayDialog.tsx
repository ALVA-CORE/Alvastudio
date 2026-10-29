import { useEffect, useState } from "react";
import BillList from "@solar-icons/react/money/BillList";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import { backPay, type ApiBackPayRow } from "@/lib/api/payouts";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";
import { NO_VALUE } from "@/lib/no-value";

type Preview = {
  /* `contributors` is a count and `awards` holds the rows. Named apart
     because reading one as the other is silent: `.length` on a number is
     `undefined`, which renders as nothing rather than as an error. */
  contributors: number;
  awards: ApiBackPayRow[];
  total_award: string;
  currency: string;
};

/**
 * Re-prices work approved before the 29 Oct rates and credits the difference.
 *
 * This was milestone back-pay. Milestones ended; the route stayed and
 * changed what it does, and `POST /payments/milestones/sync` is now a
 * deprecated alias of `POST /payments/back-pay` that returns the new shape.
 * So the dialog had to move with it or it would have been reading fields
 * that no longer arrive.
 *
 * It moves money, so it previews before it credits. Each contributor's
 * approved work is priced at the new rates **less everything ever credited
 * to them** — old per-clip pay, milestones and voids included — so anybody
 * already paid more keeps it and nobody is paid twice. Safe to run again.
 *
 * `unmeasured_narrations` is the number worth showing. Old narrations are
 * measured from their audio, and any that cannot be read are paid on their
 * recorded length rather than their speaking time. That is generous rather
 * than accurate, and an admin signing this off should be able to see how
 * much of it is a guess.
 */
export function BackPayDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setPreview(null);
    setError(null);

    backPay(false)
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not work that out."));
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const nothingDue = preview?.contributors === 0;

  /* How much of the award is priced on recorded length instead of speaking
     time, because the audio could not be read. */
  const unmeasured =
    preview?.awards.reduce((sum, row) => sum + row.unmeasured_narrations, 0) ?? 0;

  const apply = async () => {
    setApplying(true);
    setError(null);

    try {
      const result = await backPay(true);
      alvaToast.success(
        `${result.currency} ${result.total_award} credited to ${result.contributors} contributors`
      );
      onDone();
      onOpenChange(false);
    } catch (cause) {
      setError(reportApiError(cause, "Could not credit that.") ?? "Could not credit that.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="rounded-3xl border-alva-border bg-alva-card sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-foreground">
            <BillList size={20} weight="BoldDuotone" className="text-alva-accent" />
            Back-pay at the new rates
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Re-prices every contributor's approved work at the rates that
            started on 29 Oct, less everything they have already been paid.
            Anybody who was paid more keeps it, and running this twice
            credits nothing the second time.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-alva-surface px-4 py-3">
              <p className="text-xs text-muted-foreground">Contributors</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {preview ? preview.contributors : NO_VALUE}
              </p>
            </div>
            <div className="rounded-2xl bg-alva-surface px-4 py-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-alva-accent">
                {preview ? `${preview.currency} ${preview.total_award}` : NO_VALUE}
              </p>
            </div>
          </div>

          {unmeasured > 0 ? (
            <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-300">
              {unmeasured} {unmeasured === 1 ? "narration" : "narrations"} could
              not be measured, so {unmeasured === 1 ? "it is" : "they are"} paid
              on recorded length rather than speaking time. That pays slightly
              over, never under.
            </p>
          ) : null}

          {nothingDue ? (
            <p className="text-xs text-muted-foreground">
              Nothing is due. Everybody is already up to date.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Safe to run again: a second run finds nothing due. The usual
              24-hour hold applies before any of this can be withdrawn.
            </p>
          )}

          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <TextureButton
              variant="minimal"
              size="sm"
              className="w-auto"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </TextureButton>

            <TextureButton
              variant="alva"
              size="sm"
              className="w-auto"
              disabled={!preview || nothingDue}
              loading={applying}
              onClick={() => void apply()}
            >
              Credit it
            </TextureButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
