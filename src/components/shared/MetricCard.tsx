import type { ComponentType, ReactNode } from "react";
import type { IconProps } from "@solar-icons/react/lib/types";
import { cn } from "@/lib/utils";
import { alvaAccentTextureClass } from "@/lib/alva-texture";

type MetricCardProps = {
  title: string;
  value: string;
  period: string;
  trend: {
    label: string;
    positive?: boolean;
  };
  icon: ComponentType<IconProps>;
  variant?: "accent" | "card";
  className?: string;
};

export function MetricCard({
  title,
  value,
  period,
  trend,
  icon: Icon,
  variant = "card",
  className,
}: MetricCardProps) {
  const isAccent = variant === "accent";

  return (
    <article
      className={cn(
        "relative flex min-h-[9.5rem] flex-col rounded-2xl p-4",
        isAccent
          ? cn(alvaAccentTextureClass, "text-alva-bg")
          : "bg-alva-card text-foreground",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-sm font-medium",
            isAccent ? "text-alva-bg/90" : "text-muted-foreground"
          )}
        >
          {title}
        </p>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            isAccent ? "bg-alva-bg/15 text-alva-bg" : alvaAccentTextureClass
          )}
        >
          <Icon size={18} weight="BoldDuotone" className={isAccent ? undefined : "text-alva-bg"} />
        </span>
      </div>

      <div className="mt-auto pt-6">
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <TrendBadge positive={trend.positive} accent={isAccent}>
            {trend.label}
          </TrendBadge>
          <span
            className={cn(
              "text-xs",
              isAccent ? "text-alva-bg/75" : "text-muted-foreground"
            )}
          >
            {period}
          </span>
        </div>
      </div>
    </article>
  );
}

function TrendBadge({
  children,
  positive = true,
  accent = false,
}: {
  children: ReactNode;
  positive?: boolean;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        accent
          ? "bg-alva-bg/15 text-alva-bg"
          : positive
            ? "bg-alva-accent/15 text-alva-accent"
            : "bg-destructive/15 text-destructive"
      )}
    >
      {children}
    </span>
  );
}
