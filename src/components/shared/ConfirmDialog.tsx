import type { ReactNode } from "react";
import DangerTriangle from "@solar-icons/react/ui/DangerTriangle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
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
};

/**
 * One confirmation, shared by every destructive action.
 *
 * Destructive actions used to differ per surface — a two-tap trash here, a bare
 * click there — which meant the amount of protection you got depended on which
 * button you happened to reach for. This is the single answer: it names the
 * thing, says what will happen to it, and puts the irreversible option on the
 * right in red.
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
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl border-alva-border bg-alva-card p-6">
        <DialogHeader className="space-y-3 text-left">
          <span
            className={cn(
              "flex size-10 items-center justify-center rounded-full",
              tone === "danger" ? "bg-red-500/10" : "bg-alva-surface"
            )}
          >
            <DangerTriangle
              size={20}
              weight="BoldDuotone"
              className={tone === "danger" ? "text-red-400" : "text-amber-300"}
            />
          </span>
          <DialogTitle className="text-lg text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 flex items-center justify-end gap-2">
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
