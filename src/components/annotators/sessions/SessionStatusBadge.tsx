import type { ReactNode } from "react";
import {
  ANNOTATION_STATUS_LABELS,
  type AnnotationStatus,
} from "@/data/annotators/sessions";
import { cn } from "@/lib/utils";

/**
 * Status pill — same palette as the intern review queue so staff surfaces match.
 *
 * `trailing` lets the workspace fold its save state into this pill rather than
 * carrying a second indicator elsewhere. Both answer "where is this session up
 * to", so they belong in one place; the separator keeps them readable as two
 * facts rather than one run-on label.
 */
export function SessionStatusBadge({
  status,
  trailing,
  className,
}: {
  status: AnnotationStatus;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        status === "completed" && "bg-alva-accent/15 text-alva-accent",
        status === "in-progress" && "bg-amber-500/15 text-amber-300",
        status === "not-started" && "bg-alva-surface text-muted-foreground",
        className
      )}
    >
      {ANNOTATION_STATUS_LABELS[status]}
      {trailing ? (
        <>
          <span aria-hidden className="h-3 w-px bg-current opacity-30" />
          {trailing}
        </>
      ) : null}
    </span>
  );
}
