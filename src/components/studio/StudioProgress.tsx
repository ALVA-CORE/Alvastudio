import { cn } from "@/lib/utils";

type StudioProgressProps = {
  current: number;
  total: number;
  label: string;
  className?: string;
};

export function StudioProgress({
  current,
  total,
  label,
  className,
}: StudioProgressProps) {
  const safeTotal = Math.max(total, 1);
  const progress = Math.min(100, Math.max(0, (current / safeTotal) * 100));

  return (
    <section className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">
          {current}/{safeTotal}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-md bg-alva-surface">
        <div
          className="h-full rounded-md bg-[linear-gradient(90deg,hsl(var(--alva-gradient-a)),hsl(var(--alva-gradient-b)),hsl(var(--alva-gradient-c)))] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </section>
  );
}
