import { cn } from "@/lib/utils";

/**
 * Row-level status pill, in the palette the staff tables already use:
 * accent for a settled good outcome, amber for in-flight, red for a refusal,
 * surface grey for "nothing has happened yet".
 */
export type PillTone = "good" | "pending" | "bad" | "neutral";

const TONE: Record<PillTone, string> = {
  good: "bg-alva-accent/15 text-alva-accent",
  pending: "bg-amber-500/15 text-amber-300",
  bad: "bg-red-500/15 text-red-400",
  neutral: "bg-alva-surface text-muted-foreground",
};

export function AdminStatusPill({
  tone,
  children,
  className,
}: {
  tone: PillTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
        TONE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
