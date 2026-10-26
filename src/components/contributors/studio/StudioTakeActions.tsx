import Diskette from "@solar-icons/react/devices/Diskette";
import Restart from "@solar-icons/react/arrows/Restart";
import { DeleteButton } from "@/components/ui/delete-button";
import { cn } from "@/lib/utils";

/**
 * What to do with a finished take.
 *
 * Retake and Save are one control with a divider between them, because they
 * are the two halves of the same decision: keep this, or do it again. They
 * were two separate buttons with a bin wedged between them, which put the
 * only irreversible action in the middle of the two safe ones.
 *
 * The bin is the same component as the one on the admin user panel, and for
 * the same reason: it opens its own confirm pair rather than firing on the
 * first press. Throwing away a take somebody has just spoken is not
 * recoverable, and it sits to the right of the pair, away from Save.
 */
export function StudioTakeActions({
  onRetake,
  onSave,
  onDelete,
  isSaving = false,
  className,
}: {
  onRetake: () => void;
  onSave: () => void;
  /** Defaults to the same thing Retake does: the take is gone either way. */
  onDelete?: () => void;
  isSaving?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      <div className="flex h-11 items-stretch overflow-hidden rounded-full bg-alva-surface">
        <button
          type="button"
          onClick={onRetake}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 text-sm font-medium text-foreground transition-colors hover:bg-alva-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-alva-accent disabled:opacity-50"
        >
          <Restart size={16} weight="Outline" />
          Retake
        </button>

        {/* Inset so it stops short of the pill's edges, which keeps it
            reading as a seam between two halves rather than a border. */}
        <span aria-hidden className="my-2.5 w-px shrink-0 bg-alva-border" />

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 text-sm font-semibold text-alva-accent transition-colors hover:bg-alva-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-alva-accent disabled:opacity-50"
        >
          <Diskette size={16} weight="Bold" />
          {isSaving ? "Saving" : "Save"}
        </button>
      </div>

      <DeleteButton onConfirm={onDelete ?? onRetake} />
    </div>
  );
}
