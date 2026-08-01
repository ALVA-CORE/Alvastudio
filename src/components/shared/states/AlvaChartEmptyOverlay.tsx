import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AlvaChartEmptyOverlayProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  className?: string;
};

/**
 * Sits over a chart that is rendering a flat/zeroed series, so the axes and
 * card still read as a chart instead of collapsing to a bare icon.
 */
export function AlvaChartEmptyOverlay({
  icon,
  title,
  description,
  className,
}: AlvaChartEmptyOverlayProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-center gap-2 rounded-xl bg-alva-card/55 px-4 text-center backdrop-blur-[1px]",
        className
      )}
    >
      {icon && (
        <div className="flex size-10 items-center justify-center rounded-full bg-alva-surface text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="max-w-[16rem] text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
