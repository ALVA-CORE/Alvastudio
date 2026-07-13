import { cn } from "@/lib/utils";
import type { ReviewQueueItem } from "@/data/reviewQueue";

type ReviewQueuePanelProps = {
  items: ReviewQueueItem[];
  activeId: string;
  onSelect: (id: string) => void;
};

export function ReviewQueuePanel({
  items,
  activeId,
  onSelect,
}: ReviewQueuePanelProps) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-alva-border">
      <div className="px-3 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Queue
        </p>
        <p className="mt-0.5 text-sm text-foreground">{items.length} pending</p>
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {items.map((item) => {
          const isActive = item.id === activeId;

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  "w-full rounded-xl px-3 py-2.5 text-left transition-colors",
                  isActive
                    ? "bg-alva-card text-foreground"
                    : "text-muted-foreground hover:bg-alva-card/60 hover:text-foreground"
                )}
              >
                <p className="truncate text-sm font-medium">{item.contributor}</p>
                <p className="mt-0.5 truncate text-[11px] opacity-80">
                  {item.mode} · {item.duration}
                </p>
                <p className="mt-0.5 text-[10px] opacity-60">{item.submittedAt}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
