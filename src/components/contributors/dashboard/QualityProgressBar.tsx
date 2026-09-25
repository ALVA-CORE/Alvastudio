import { cn } from "@/lib/utils";

type QualityProgressBarProps = {
  className?: string;
  isEmpty?: boolean;
  /**
   * Live counts from `/dashboard/contributor`. Omit them and the seeded
   * proportions are used — the endpoint returns a status breakdown, so the bar
   * itself is real once these are passed.
   */
  breakdown?: {
    approved: number;
    in_review: number;
    not_approved: number;
    rejected: number;
    total: number;
  };
  /** Kept for the callers that only have the two headline figures. */
  approved?: number;
  total?: number;
};

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

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

const EMPTY_INSIGHTS = [
  { label: "Acceptance rate", value: "0%" },
  { label: "Avg review time", value: "—" },
  { label: "This week", value: "0 clips" },
];

export function QualityProgressBar({
  className,
  isEmpty = false,
  breakdown,
  approved,
  total,
}: QualityProgressBarProps) {
  /* Real proportions when the dashboard supplied them. Percentages are derived
   * from the counts rather than sent, so they always sum to the whole. */
  const segments: QualitySegment[] =
    breakdown && breakdown.total > 0
      ? [
          { key: "approved", label: "Approved", value: pct(breakdown.approved, breakdown.total), color: "hsl(var(--alva-accent))" },
          { key: "pending", label: "In review", value: pct(breakdown.in_review, breakdown.total), color: "hsl(0 0% 42%)" },
          { key: "rework", label: "Re-record", value: pct(breakdown.not_approved, breakdown.total), color: "hsl(38 92% 50%)" },
          { key: "rejected", label: "Rejected", value: pct(breakdown.rejected, breakdown.total), color: "hsl(0 72% 51%)" },
        ]
      : SEGMENTS;

  const liveRate =
    total && total > 0 && approved != null
      ? `${Math.round((approved / total) * 100)}%`
      : null;

  const insights = isEmpty
    ? EMPTY_INSIGHTS
    : liveRate
      ? [
          { label: "Acceptance rate", value: liveRate },
          // No review-time or weekly figure on the endpoint yet.
          { label: "Avg review time", value: "—" },
          { label: "Total clips", value: String(total) },
        ]
      : INSIGHTS;

  return (
    <section className={cn("mt-6 px-4", className)}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">Review quality</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isEmpty
              ? "No clips reviewed yet"
              : "How your submissions are grading out"}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">Last 30 days</span>
      </div>

      <div className="flex h-10 w-full overflow-hidden rounded-md bg-alva-surface">
        {!isEmpty &&
          segments.map((segment, index) => (
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
        {segments.map((segment) => (
          <div key={segment.key} className="flex items-center gap-2">
            <span
              className={cn("size-2 shrink-0 rounded-full", isEmpty && "opacity-35")}
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-xs text-muted-foreground">
              {segment.label}{" "}
              <span className="font-medium text-foreground">
                {isEmpty ? "0%" : `${segment.value}%`}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {insights.map((item) => (
          <div key={item.label} className="rounded-xl bg-alva-surface px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
