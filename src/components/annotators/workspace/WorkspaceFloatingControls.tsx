import { memo, type ReactNode } from "react";
import AltArrowLeft from "@solar-icons/react/arrows/AltArrowLeft";
import UndoLeft from "@solar-icons/react/arrows-action/UndoLeft";
import UndoRight from "@solar-icons/react/arrows-action/UndoRight";
import { useAnnotation, useAnnotationActions } from "@/lib/annotation/context";
import { selectCanRedo, selectCanUndo } from "@/lib/annotation/store";
import { cn } from "@/lib/utils";

/**
 * Undo/redo and the exit, floating over the workspace instead of sitting in a
 * header bar.
 *
 * The bar they replace cost a full row of vertical space to carry three
 * controls and a status line — on a transcript editor that row is better spent
 * on transcript. Floating them keeps both within reach without a permanent
 * band, and the save status moved to the panel's status pill where the session's
 * other state already lives.
 *
 * The wrapper is `pointer-events-none` so the strip never intercepts a click
 * meant for the transcript underneath; only the buttons themselves take events.
 */

const FLOATING_BUTTON =
  "flex size-8 items-center justify-center rounded-full border border-alva-border bg-alva-card/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent disabled:pointer-events-none disabled:opacity-40";

function HistoryButton({
  label,
  hint,
  disabled,
  onClick,
  icon,
}: {
  label: string;
  hint: string;
  disabled: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={`${label} (${hint})`}
      disabled={disabled}
      onClick={onClick}
      className={FLOATING_BUTTON}
    >
      {icon}
    </button>
  );
}

export type WorkspaceFloatingControlsProps = {
  onBack: () => void;
  className?: string;
};

export const WorkspaceFloatingControls = memo(function WorkspaceFloatingControls({
  onBack,
  className,
}: WorkspaceFloatingControlsProps) {
  const canUndo = useAnnotation(selectCanUndo);
  const canRedo = useAnnotation(selectCanRedo);
  const { undo, redo } = useAnnotationActions();

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-2 px-3 pt-3",
        className
      )}
    >
      {/* Spacer keeps undo/redo optically centred against the back button. */}
      <div className="size-8 shrink-0" aria-hidden />

      <div className="pointer-events-auto flex items-center gap-1.5">
        <HistoryButton
          label="Undo"
          hint="⌘Z"
          disabled={!canUndo}
          onClick={undo}
          icon={<UndoLeft size={15} weight="Linear" />}
        />
        <HistoryButton
          label="Redo"
          hint="⌘⇧Z"
          disabled={!canRedo}
          onClick={redo}
          icon={<UndoRight size={15} weight="Linear" />}
        />
      </div>

      <button
        type="button"
        onClick={onBack}
        aria-label="Back to sessions"
        title="Back to sessions"
        className={cn(FLOATING_BUTTON, "pointer-events-auto shrink-0")}
      >
        <AltArrowLeft size={16} weight="Linear" />
      </button>
    </div>
  );
});
