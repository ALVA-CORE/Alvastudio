import { cn } from "@/lib/utils";

type QualitySegment = {
  key: string;
  label: string;
  value: number;
  color: string;
};

const SEGMENTS: QualitySegment[] = [
  { key: "approved", label: "Approved", value: 62, color: "hsl(var(--alva-accent))" },
  { key: "pending", label: "In review", value: 24, color: "hsl(0 0% 42%)" },
  { key: "rework", label: "Re-record", value: 9, color: "hsl(38 92% 50%)" },
  { key: "rejected", label: "Rejected", value: 5, color: "hsl(0 72% 51%)" },
];

const INSIGHTS = [
  { label: "Acceptance rate", value: "87%" },
  { label: "Avg review time", value: "1.2d" },
  { label: "This week", value: "+12 clips" },
];

export function QualityProgressBar({ className }: { className?: string }) {
  return (
    <section className={cn("mt-6 px-4", className)}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">Review quality</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            How your submissions are grading out
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">Last 30 days</span>
      </div>

      <div className="flex h-10 w-full overflow-hidden rounded-md bg-alva-surface">
        {SEGMENTS.map((segment, index) => (
          <div
            key={segment.key}
            className={cn(
              "h-full transition-all",
              index > 0 && "border-l border-alva-bg/80"
            )}
            style={{
              width: `${segment.value}%`,
              backgroundColor: segment.color,
            }}
            title={`${segment.label}: ${segment.value}%`}
          />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {SEGMENTS.map((segment) => (
          <div key={segment.key} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-xs text-muted-foreground">
              {segment.label}{" "}
              <span className="font-medium text-foreground">{segment.value}%</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {INSIGHTS.map((item) => (
          <div
            key={item.label}
            className="rounded-xl bg-alva-surface px-3 py-2.5"
          >
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
