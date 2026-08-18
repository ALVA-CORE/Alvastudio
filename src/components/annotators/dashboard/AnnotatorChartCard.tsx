import type { ReactNode } from "react";
import GraphUp from "@solar-icons/react/business/GraphUp";
import { AlvaChartEmptyOverlay } from "@/components/shared/states/AlvaChartEmptyOverlay";
import { cn } from "@/lib/utils";

type AnnotatorChartCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  /** Slot on the title row — legend, unit hint, range chip. */
  aside?: ReactNode;
  emptyMessage?: { title: string; description?: string };
};

/**
 * Shared frame for every tile in the annotator bento. Keeps the plot area a
 * `min-h-0 flex-1` so charts that size to their container don't blow the grid
 * row out, and hosts the empty overlay so a zeroed chart keeps its frame.
 */
export function AnnotatorChartCard({
  title,
  subtitle,
  children,
  className,
  aside,
  emptyMessage,
}: AnnotatorChartCardProps) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-2xl bg-alva-card p-4",
        className
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {children}
        {emptyMessage && (
          <AlvaChartEmptyOverlay
            icon={<GraphUp size={18} weight="Outline" />}
            title={emptyMessage.title}
            description={emptyMessage.description}
          />
        )}
      </div>
    </section>
  );
}
