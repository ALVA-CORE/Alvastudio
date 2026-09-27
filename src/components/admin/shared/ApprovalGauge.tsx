import { Gauge } from "@/components/charts/gauge";

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
}: {
  /** 0–100. */
  value: number;
  label: string;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center">
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
        className="w-full"
      />
    </div>
  );
}
