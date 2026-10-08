import { cn } from "@/lib/utils";

export type PersonBar = {
  id: string;
  name: string;
  /** The bar's length. */
  value: number;
  /** Unit after the figure, e.g. "clips". */
  unit: string;
  /** One supporting fact, carried under the name. */
  meta?: string;
};

/**
 * Who did how much, ranked.
 *
 * This was three columns of numbers in a card labelled as a chart, which is a
 * table with the lines taken out. A reader comparing people wants the ordering
 * and the gaps between them, and a bar gives both without being read; the
 * figure stays on the row for anyone who needs the exact number.
 *
 * Bars are scaled against the leader, not against a round number, because the
 * question is who is carrying the queue rather than how close anyone is to a
 * target.
 */
export function PeopleBars({
  rows,
  emptyMessage,
  className,
}: {
  rows: PersonBar[];
  emptyMessage: string;
  className?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const ranked = [...rows].sort((a, b) => b.value - a.value);
  const max = Math.max(...ranked.map((row) => row.value), 1);

  return (
    <ul
      className={cn(
        "alva-thin-scrollbar max-h-[13rem] space-y-2.5 overflow-y-auto pr-1",
        className
      )}
    >
      {ranked.map((row) => (
        <li key={row.id}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-xs text-foreground">{row.name}</span>
            <span className="shrink-0 text-xs tabular-nums text-foreground">
              {row.value}
              <span className="ml-1 text-muted-foreground">{row.unit}</span>
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-alva-border/60">
              <div
                className="h-full rounded-full bg-alva-accent"
                style={{ width: `${Math.max((row.value / max) * 100, 2)}%` }}
              />
            </div>
            {row.meta ? (
              <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                {row.meta}
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
