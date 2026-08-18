import { memo, useEffect, useReducer } from "react";
import { useAnnotation } from "@/lib/annotation/context";
import { cn } from "@/lib/utils";

/**
 * Save state, as a dot that becomes a spinner.
 *
 * One glyph in one position through the whole cycle: a steady green dot at rest,
 * the same dot spinning while a write is in flight. Swapping between unrelated
 * icons at that size reads as flicker; morphing one shape reads as progress.
 *
 * The label settles into relative time ("Last saved 4m ago") rather than holding
 * "Changes saved" forever — the useful question minutes later is *how stale is
 * this*, not *did it work*.
 */

/** How often the relative label re-computes. */
const TICK_INTERVAL = 20_000;

function relativeLabel(savedAt: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - savedAt) / 1000));
  if (seconds < 5) return "Changes saved";
  if (seconds < 60) return `Last saved ${seconds}s ago`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Last saved ${minutes}m ago`;

  return `Last saved ${Math.round(minutes / 60)}h ago`;
}

type AutosaveIndicatorProps = {
  /** Shown as a Retry button while the status is `error`. */
  onRetry?: () => void;
  className?: string;
};

function StatusDot({ status }: { status: string }) {
  if (status === "saving") {
    return (
      <span
        aria-hidden
        className="size-2.5 shrink-0 animate-spin rounded-full border border-alva-accent border-t-transparent motion-reduce:animate-none"
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "size-2 shrink-0 rounded-full transition-colors",
        status === "error" && "bg-red-400",
        status === "offline" && "bg-amber-300",
        status === "dirty" && "bg-muted-foreground",
        status !== "error" && status !== "offline" && status !== "dirty" && "bg-alva-accent"
      )}
    />
  );
}

export const AutosaveIndicator = memo(function AutosaveIndicator({
  onRetry,
  className,
}: AutosaveIndicatorProps) {
  // Three primitive slices rather than one object: `useStore` compares with
  // Object.is, so a fresh object literal would re-render on every store write.
  const status = useAnnotation((state) => state.saveStatus);
  const lastSavedAt = useAnnotation((state) => state.lastSavedAt);
  const saveError = useAnnotation((state) => state.saveError);

  const [, tick] = useReducer((count: number) => count + 1, 0);

  // Age the label. Only runs in the settled states, so an idle workspace is not
  // holding a timer for nothing.
  const isSettled = status === "saved" || status === "idle";
  useEffect(() => {
    if (!isSettled || lastSavedAt === null) return;

    const id = window.setInterval(tick, TICK_INTERVAL);
    return () => window.clearInterval(id);
  }, [isSettled, lastSavedAt]);

  let label: string;
  if (status === "saving") label = "Saving…";
  else if (status === "error") label = "Save failed";
  else if (status === "offline") label = "Offline — changes held";
  else if (status === "dirty") label = "Unsaved changes";
  else if (lastSavedAt !== null) label = relativeLabel(lastSavedAt, Date.now());
  else label = "All changes saved";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        role="status"
        aria-live="polite"
        title={status === "error" && saveError ? saveError : undefined}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs",
          status === "error" && "text-red-400",
          status === "offline" && "text-amber-300",
          status !== "error" && status !== "offline" && "text-muted-foreground"
        )}
      >
        <StatusDot status={status} />
        {label}
      </span>

      {status === "error" && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-alva-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
});
