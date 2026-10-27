import type { ReviewQueueItem } from "@/data/reviewQueue";
import { cn } from "@/lib/utils";

function Fact({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate text-sm text-foreground",
          strong && "font-medium"
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

type ReviewMetadataCardProps = {
  item: ReviewQueueItem;
  className?: string;
};

export function ReviewMetadataCard({ item, className }: ReviewMetadataCardProps) {
  return (
    <section className={cn("min-w-0 rounded-2xl bg-alva-card p-3 sm:p-4", className)}>
      <h3 className="text-sm font-semibold text-foreground">Metadata</h3>

      {/* Two abreast on every width. Five one-line facts stacked is five
          rows of mostly empty space, and on a phone it pushed the prompt and
          the questions below the fold. */}
      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          <Fact label="Contributor" value={item.contributor} strong />
          <Fact label="Duration" value={item.duration} />
          <Fact label="Submitted" value={item.submittedAt} />
          <Fact label="Device" value={item.device} />
          <Fact label="Language" value={item.language} />

          {/* Its own row, and broken mid-string. A 36-character UUID in a
              half-width cell is what was pushing the page sideways. */}
          <div className="col-span-2 min-w-0">
            <p className="text-xs text-muted-foreground">Clip ID</p>
            <p className="mt-0.5 break-all font-mono text-xs text-foreground">
              {item.id}
            </p>
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
