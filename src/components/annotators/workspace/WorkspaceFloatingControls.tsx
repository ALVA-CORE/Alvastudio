import { memo, type ReactNode } from "react";
import AltArrowLeft from "@solar-icons/react/arrows/AltArrowLeft";
import UndoLeft from "@solar-icons/react/arrows-action/UndoLeft";
import UndoRight from "@solar-icons/react/arrows-action/UndoRight";
import { BorderBeam } from "border-beam";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAnnotation, useAnnotationActions } from "@/lib/annotation/context";
import { selectCanRedo, selectCanUndo } from "@/lib/annotation/store";
import { cn } from "@/lib/utils";

/**
 * Undo/redo and the exit, floating over the workspace instead of sitting in a
 * header bar.
 *
 * The bar they replace cost a full row of vertical space to carry three
 * controls and a status line — on a transcript editor that row is better spent
 * on transcript. The save status moved to the panel's status pill, where the
 * session's other state already lives.
 *
 * The strip is `pointer-events-none` so it never intercepts a click meant for
 * the transcript underneath; only the controls themselves take events.
 */

/** Both float on the page floor colour, a step below the panels they sit over. */
const FLOATING_SURFACE =
  "border border-alva-border bg-alva-bg/95 text-muted-foreground shadow-sm backdrop-blur";

const ICON_BUTTON =
  "flex size-8 items-center justify-center rounded-full transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent disabled:pointer-events-none disabled:opacity-40";

function Hinted({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
        {hint ? <span className="ml-1.5 text-muted-foreground">{hint}</span> : null}
      </TooltipContent>
    </Tooltip>
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
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-2 px-4 pt-5",
          className
        )}
      >
        <Hinted label="Back to sessions">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to sessions"
            className={cn(ICON_BUTTON, FLOATING_SURFACE, "pointer-events-auto shrink-0")}
          >
            <AltArrowLeft size={16} weight="Linear" />
          </button>
        </Hinted>

        {/* Undo and redo read as one control: they are the same mechanism in two
            directions, so they share a surface and the beam wraps the pair. */}
        <div className="pointer-events-auto relative overflow-visible rounded-full">
          <BorderBeam
            size="pulse-inner"
            colorVariant="mono"
            theme="dark"
            strength={1}
            duration={2.4}
            borderRadius={999}
            className="overflow-visible rounded-full"
          >
            <div
              className={cn(
                "relative z-[1] flex items-center gap-0.5 rounded-full p-0.5",
                FLOATING_SURFACE
              )}
            >
              <Hinted label="Undo" hint="⌘Z">
                <button
                  type="button"
                  aria-label="Undo"
                  disabled={!canUndo}
                  onClick={undo}
                  className={ICON_BUTTON}
                >
                  <UndoLeft size={15} weight="Linear" />
                </button>
              </Hinted>

              <span aria-hidden className="h-4 w-px bg-alva-border" />

              <Hinted label="Redo" hint="⌘⇧Z">
                <button
                  type="button"
                  aria-label="Redo"
                  disabled={!canRedo}
                  onClick={redo}
                  className={ICON_BUTTON}
                >
                  <UndoRight size={15} weight="Linear" />
                </button>
              </Hinted>
            </div>
          </BorderBeam>
        </div>

        {/* Balances the back button so the pair stays optically centred. */}
        <div className="size-8 shrink-0" aria-hidden />
      </div>
    </TooltipProvider>
  );
});
