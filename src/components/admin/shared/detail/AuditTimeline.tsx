import { cn } from "@/lib/utils";

export type AuditEntry = {
  id: string;
  label: string;
  at: Date;
  /** Marks the events an admin caused, so they read apart from the subject's own. */
  byAdmin?: boolean;
};

export function formatAuditTimestamp(date: Date) {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * What has happened to this thing, newest first.
 *
 * Newest first because an audit trail is read from what just changed, not from
 * the beginning. The rail stops at the last dot rather than running past it —
 * a line trailing into space implies more below.
 */
export function AuditTimeline({
  entries,
  emptyMessage = "Nothing has happened here yet.",
}: {
  entries: AuditEntry[];
  emptyMessage?: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <ol className="relative">
      {entries.map((entry, index) => (
        <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
          {index < entries.length - 1 ? (
            <span
              aria-hidden
              className="absolute left-[3.5px] top-3 h-full w-px bg-alva-border"
            />
          ) : null}
          <span
            aria-hidden
            className={cn(
              "relative mt-1.5 size-2 shrink-0 rounded-full",
              entry.byAdmin ? "bg-amber-300" : "bg-alva-accent"
            )}
          />
          <div className="min-w-0">
            <p className="text-sm text-foreground">{entry.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatAuditTimestamp(entry.at)}
              {entry.byAdmin ? " · by an admin" : null}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
