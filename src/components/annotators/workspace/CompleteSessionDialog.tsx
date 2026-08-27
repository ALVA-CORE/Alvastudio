import { memo } from "react";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import DangerTriangle from "@solar-icons/react/ui/DangerTriangle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import { cn } from "@/lib/utils";

/**
 * Confirmation for handing a session back as finished.
 *
 * Submitting is not destructive, but it is not quietly reversible either — the
 * session leaves the annotator's queue — so it gets a stop rather than a toast
 * with an undo. The dialog states what is actually being submitted (segment and
 * tag counts) so the decision is made against numbers, not memory.
 *
 * Outstanding conformance errors are surfaced but never block: the annotator is
 * closer to the audio than the validator is, and a rule that cannot be overruled
 * gets worked around instead of followed.
 */

export type CompleteSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** Disables the confirm while a save is in flight. */
  isSubmitting?: boolean;
  segmentCount: number;
  tagCount: number;
  errors: number;
};

export const CompleteSessionDialog = memo(function CompleteSessionDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
  segmentCount,
  tagCount,
  errors,
}: CompleteSessionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // Fully rounded rather than the card radius: this is a transient
          // object over the workspace, not another panel in it.
          "max-w-md gap-0 overflow-hidden rounded-3xl border-alva-border bg-alva-card p-0",
          "[&>button]:hidden"
        )}
      >
        <div className="px-6 pb-5 pt-7 text-center">
          <span className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-alva-accent/15 text-alva-accent">
            <CheckCircle size={22} weight="BoldDuotone" />
          </span>

          <DialogTitle className="text-base font-semibold text-foreground">
            Mark this session as done?
          </DialogTitle>

          <DialogDescription className="mx-auto mt-2 max-w-[22rem] text-sm leading-relaxed text-muted-foreground">
            It leaves your queue and goes forward for review. You can still open
            it again, but it will no longer be assigned to you.
          </DialogDescription>

          {/* One line behind a divider: this is a receipt of what is being
              handed over, and three facts on three rows read as three separate
              warnings rather than one summary. */}
          <div className="mt-5 flex items-center justify-center gap-3 border-t border-alva-border pt-4 text-xs text-muted-foreground">
            <span className="tabular-nums">
              <span className="text-foreground">{segmentCount}</span> segments
            </span>

            <span aria-hidden className="h-3 w-px shrink-0 bg-alva-border" />

            <span className="tabular-nums">
              <span className="text-foreground">{tagCount}</span> tags
            </span>

            {errors > 0 && (
              <>
                <span aria-hidden className="h-3 w-px shrink-0 bg-alva-border" />
                <span className="flex items-center gap-1 tabular-nums text-amber-300">
                  <DangerTriangle size={12} weight="BoldDuotone" className="shrink-0" />
                  {errors} {errors === 1 ? "issue" : "issues"}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-alva-border px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            Keep editing
          </button>

          <TextureButton
            variant="alva"
            size="sm"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-auto"
          >
            {isSubmitting ? "Submitting…" : "Mark as done"}
          </TextureButton>
        </div>
      </DialogContent>
    </Dialog>
  );
});
