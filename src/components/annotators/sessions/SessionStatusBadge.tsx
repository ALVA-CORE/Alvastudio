import {
  ANNOTATION_STATUS_LABELS,
  type AnnotationStatus,
} from "@/data/annotators/sessions";
import { cn } from "@/lib/utils";

/** Status pill — same palette as the intern review queue so staff surfaces match. */
export function SessionStatusBadge({ status }: { status: AnnotationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        status === "completed" && "bg-alva-accent/15 text-alva-accent",
        status === "in-progress" && "bg-amber-500/15 text-amber-300",
        status === "not-started" && "bg-alva-surface text-muted-foreground"
      )}
    >
      {ANNOTATION_STATUS_LABELS[status]}
    </span>
  );
}
