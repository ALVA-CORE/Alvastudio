import { useEffect, useState } from "react";
import BillList from "@solar-icons/react/money/BillList";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import { syncMilestones } from "@/lib/api/payouts";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";
import { NO_VALUE } from "@/lib/no-value";

type Preview = {
  contributors: number;
  total_award: string;
  currency: string;
};

/**
 * Back-pays the milestones contributors reached before milestone pay shipped.
 *
 * A one-off, but one that moves money, so it previews before it credits: the
 * route is a preview unless `apply` is set, and this shows what that preview
 * says before offering the button that spends it.
 *
 * Running it twice is safe — a second run finds nothing due — so a plain
 * confirm is enough. The 24-hour hold still applies before anything credited
 * here can be withdrawn.
 */
export function SyncMilestonesDialog({
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

    syncMilestones(false)
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

  const apply = async () => {
    setApplying(true);
    setError(null);

    try {
      const result = await syncMilestones(true);
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
            Back-pay milestones
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Credits the blocks of 500 approved clips contributors had already
            reached before milestone pay started. Anything they were paid per
            clip is subtracted, so nothing is paid twice.
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
