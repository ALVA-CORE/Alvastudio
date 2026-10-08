import { Gauge } from "@/components/charts/gauge";
import { cn } from "@/lib/utils";

/**
 * One rate, as an arc.
 *
 * A gauge is the right mark for exactly one thing: a single value against a
 * fixed 0–100 scale where the reader already has an opinion about what "good"
 * is. Approval rate qualifies. It earns the space a bar would not, because
 * there is nothing to compare it against — one number, read at a glance.
 */
export function ApprovalGauge({
  value,
  label,
  className,
}: {
  /** 0–100. */
  value: number;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full w-full items-center justify-center", className)}>
      <Gauge
        orientation="arc"
        value={value}
        centerValue={value}
        defaultLabel={label}
        suffix="%"
        totalNotches={44}
        spacing={42}
        useGradient
        activeGradient={["#7DFAB6", "#25F07D"]}
        inactiveFill="hsl(var(--alva-border))"
        inactiveFillOpacity={0.55}
        minWidth={0}
        /* Bigger than the chart default, because the figure is the point of a
           gauge, but lighter: at bold it outweighed the arc it belongs to and
           a three-character rate ran past the ends of the track. */
        centerValueClassName="font-semibold tabular-nums leading-none text-[clamp(1rem,22cqw,1.75rem)]"
        centerLabelClassName="max-w-full truncate leading-tight text-[clamp(0.625rem,9cqw,0.75rem)]"
        className="w-full"
      />
    </div>
  );
}
