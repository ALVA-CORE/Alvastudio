import { DEV_UI_STATE_LABELS } from "@/lib/dev-ui-state";
import { useDevUiState } from "@/hooks/use-dev-ui-state";
import { cn } from "@/lib/utils";

type DevUiStateToggleProps = {
  className?: string;
};

/** Temporary dev control — remove when real data wiring is done. */
export function DevUiStateToggle({ className }: DevUiStateToggleProps) {
  const { devUiState, cycleDevUiStateMode } = useDevUiState();

  return (
    <button
      type="button"
      onClick={cycleDevUiStateMode}
      className={cn(
        "fixed bottom-20 right-4 z-[60] rounded-full border border-alva-border bg-alva-card px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground shadow-lg transition-colors hover:text-foreground md:bottom-6",
        className
      )}
    >
      UI: {DEV_UI_STATE_LABELS[devUiState]}
    </button>
  );
}
