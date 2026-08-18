import { cn } from "@/lib/utils";
import {
  DASHBOARD_TIME_RANGES,
  type DashboardTimeRange,
} from "@/data/internDashboard";

type DashboardTimeFilterProps = {
  value: DashboardTimeRange;
  onChange: (value: DashboardTimeRange) => void;
  className?: string;
};

export function DashboardTimeFilter({
  value,
  onChange,
  className,
}: DashboardTimeFilterProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-alva-surface p-1",
        className
      )}
    >
      {DASHBOARD_TIME_RANGES.map((range) => {
        const isActive = range.id === value;

        return (
          <button
            key={range.id}
            type="button"
            onClick={() => onChange(range.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              isActive
                ? "bg-alva-card text-alva-accent"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}
