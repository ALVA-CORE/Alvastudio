import { type ReactNode } from "react";
import ArrowLeft from "@solar-icons/react/arrows/ArrowLeft";
import UndoLeft from "@solar-icons/react/arrows-action/UndoLeft";
import UndoRight from "@solar-icons/react/arrows-action/UndoRight";
import { useAnnotation, useAnnotationActions } from "@/lib/annotation/context";
import { selectCanRedo, selectCanUndo } from "@/lib/annotation/store";
import { AutosaveIndicator } from "@/components/annotators/workspace/AutosaveIndicator";
import { cn } from "@/lib/utils";

/**
 * Workspace header: back on the left, history in the middle, save state right.
 *
 * Deliberately sparse. Session code, topic and the conformance roll-up all used
 * to live here and were removed — the annotator already knows which session
 * they opened, and a running error count above the text is a scold, not a tool.
 * That metadata lives in the right-hand sidebar, where it can be read on demand
 * rather than stared at.
 *
 * The centre slot is a real grid column (`1fr auto 1fr`), not a flex spacer, so
 * the undo/redo pair sits on the true optical centre.
 */

const IS_APPLE =
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad|ipod/i.test(navigator.userAgent ?? "");

const UNDO_HINT = IS_APPLE ? "⌘Z" : "Ctrl+Z";
const REDO_HINT = IS_APPLE ? "⇧⌘Z" : "Ctrl+Shift+Z";

type WorkspaceHeaderProps = {
  onBack: () => void;
  /** Forwarded to the autosave indicator's Retry button. */
  onRetrySave?: () => void;
  className?: string;
};

type HistoryButtonProps = {
  label: string;
  hint: string;
  disabled: boolean;
  onClick: () => void;
  icon: ReactNode;
};

function HistoryButton({ label, hint, disabled, onClick, icon }: HistoryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={`${label} (${hint})`}
      className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-alva-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent disabled:pointer-events-none disabled:opacity-40"
    >
      {icon}
    </button>
  );
}

export function WorkspaceHeader({
  onBack,
  onRetrySave,
  className,
}: WorkspaceHeaderProps) {
  const canUndo = useAnnotation(selectCanUndo);
  const canRedo = useAnnotation(selectCanRedo);
  const { undo, redo } = useAnnotationActions();

  return (
    <header
      aria-label="Workspace"
      className={cn(
        "sticky top-0 z-40 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-alva-border bg-alva-card px-3 py-2",
        className
      )}
    >
      <div className="flex min-w-0 items-center">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to sessions"
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-alva-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
        >
          <ArrowLeft size={18} weight="Outline" />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <HistoryButton
          label="Undo"
          hint={UNDO_HINT}
          disabled={!canUndo}
          onClick={undo}
          icon={<UndoLeft size={18} weight="Outline" />}
        />
        <HistoryButton
          label="Redo"
          hint={REDO_HINT}
          disabled={!canRedo}
          onClick={redo}
          icon={<UndoRight size={18} weight="Outline" />}
        />
      </div>

      <div className="flex min-w-0 items-center justify-end">
        <AutosaveIndicator onRetry={onRetrySave} />
      </div>
    </header>
  );
}
