import type { ReactNode } from "react";
import DangerTriangle from "@solar-icons/react/ui/DangerTriangle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** What will happen, in the caller's own words. */
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isPending?: boolean;
  /** `danger` for anything that removes access or data. */
  tone?: "danger" | "default";
  /** Optional receipt line under the description — counts, names, totals. */
  detail?: ReactNode;
};

/**
 * One confirmation, shared by every destructive action.
 *
 * Built on the same shape as `CompleteSessionDialog`, which is the pattern the
 * rest of the app already uses: centred icon, centred title and body, and a
 * divided footer with the action on the right. Destructive actions used to
 * differ per surface — a two-tap trash here, a bare click there — which meant
 * how much protection you got depended on which button you reached for.
 *
 * Cancel is focused on open, not confirm: the default action of a dialog you
 * opened by accident should be to leave.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  isPending = false,
  tone = "danger",
  detail,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // Fully rounded rather than the card radius: this is a transient
          // object over the page, not another panel in it.
          "max-w-md gap-0 overflow-hidden rounded-3xl border-alva-border bg-alva-card p-0",
          "[&>button]:hidden"
        )}
      >
        <div className="px-6 pb-5 pt-7 text-center">
          <span
            className={cn(
              "mx-auto mb-4 flex size-11 items-center justify-center rounded-full",
              tone === "danger"
                ? "bg-red-500/15 text-red-400"
                : "bg-amber-500/15 text-amber-300"
            )}
          >
            <DangerTriangle size={22} weight="BoldDuotone" />
          </span>

          <DialogTitle className="text-base font-semibold text-foreground">
            {title}
          </DialogTitle>

          <DialogDescription className="mx-auto mt-2 max-w-[22rem] text-sm leading-relaxed text-muted-foreground">
            {description}
          </DialogDescription>

          {detail ? (
            <div className="mt-5 flex items-center justify-center gap-3 border-t border-alva-border pt-4 text-xs text-muted-foreground">
              {detail}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-alva-border px-6 py-4">
          <button
            type="button"
            autoFocus
            onClick={() => onOpenChange(false)}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            {cancelLabel}
          </button>

          <TextureButton
            variant={tone === "danger" ? "destructive" : "alva"}
            size="sm"
            className="w-auto"
            loading={isPending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </TextureButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
