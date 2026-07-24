import type { ReviewQueueItem } from "@/data/reviewQueue";
import { cn } from "@/lib/utils";

type ReviewMetadataCardProps = {
  item: ReviewQueueItem;
  className?: string;
};

export function ReviewMetadataCard({ item, className }: ReviewMetadataCardProps) {
  return (
    <section className={cn("rounded-2xl bg-alva-card p-4", className)}>
      <h3 className="text-sm font-semibold text-foreground">Metadata</h3>

      <div className="mt-3 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Contributor</p>
          <p className="mt-0.5 text-sm font-medium text-foreground">{item.contributor}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="mt-0.5 text-sm text-foreground">{item.duration}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Submitted</p>
            <p className="mt-0.5 text-sm text-foreground">{item.submittedAt}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Device</p>
            <p className="mt-0.5 text-sm text-foreground">{item.device}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Language</p>
            <p className="mt-0.5 text-sm text-foreground">{item.language}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Clip ID</p>
            <p className="mt-0.5 text-sm text-foreground">{item.id}</p>
          </div>
        </div>

        <div className="rounded-xl bg-alva-surface p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Assigned prompt
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">{item.prompt}</p>
        </div>
      </div>
    </section>
  );
}
