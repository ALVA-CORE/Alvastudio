import { useMemo, useState } from "react";
import Magnifier from "@solar-icons/react/search/Magnifier";
import { cn } from "@/lib/utils";
import type { ReviewQueueItem } from "@/data/reviewQueue";

type ReviewQueuePanelProps = {
  items: ReviewQueueItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
};

export function ReviewQueuePanel({
  items,
  activeId,
  onSelect,
  className,
}: ReviewQueuePanelProps) {
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;

    return items.filter(
      (item) =>
        item.contributor.toLowerCase().includes(normalized) ||
        item.mode.toLowerCase().includes(normalized) ||
        item.prompt.toLowerCase().includes(normalized)
    );
  }, [items, query]);

  return (
    <aside className={cn("flex w-44 shrink-0 flex-col", className)}>
      <div className="shrink-0 space-y-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Queue
          </p>
          <p className="mt-0.5 text-sm text-foreground">{items.length} pending</p>
        </div>

        <label className="relative block">
          <Magnifier
            size={16}
            weight="Outline"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="h-8 w-full rounded-full border-0 bg-alva-card pl-9 pr-3 text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
        {filteredItems.map((item) => {
          const isActive = item.id === activeId;

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  "w-full rounded-xl px-2.5 py-2 text-left transition-colors",
                  isActive
                    ? "bg-alva-card text-foreground"
                    : "text-muted-foreground hover:bg-alva-card/60 hover:text-foreground"
                )}
              >
                <p className="truncate text-sm font-medium">{item.contributor}</p>
                <p className="mt-0.5 truncate text-[10px] opacity-80">
                  {item.mode} · {item.duration}
                </p>
              </button>
            </li>
          );
        })}

        {filteredItems.length === 0 && (
          <li className="py-4 text-center text-xs text-muted-foreground">
            No matches
          </li>
        )}
      </ul>
    </aside>
  );
}
