import { cn } from "@/lib/utils";

type AlvaTopGlowProps = {
  className?: string;
  /** Scales the whole stack down for denser pages like profile. */
  intensity?: "full" | "soft";
};

/**
 * Layered accent glow anchored to the top of a page. Multiple long-tail stops
 * are what keep the fade from banding into a visible edge.
 */
export function AlvaTopGlow({ className, intensity = "full" }: AlvaTopGlowProps) {
  const isSoft = intensity === "soft";

  return (
    <div className={cn("pointer-events-none absolute inset-x-0 top-0", className)} aria-hidden>
      <div
        className={cn(
          "absolute inset-x-0 top-0",
          isSoft
            ? "h-[42vh] min-h-[260px] bg-[linear-gradient(to_bottom,hsl(var(--alva-accent)/0.26)_0%,hsl(var(--alva-accent)/0.15)_18%,hsl(var(--alva-accent)/0.08)_36%,hsl(var(--alva-accent)/0.035)_58%,hsl(var(--alva-accent)/0.01)_78%,transparent_100%)]"
            : "h-[52vh] min-h-[320px] bg-[linear-gradient(to_bottom,hsl(var(--alva-accent)/0.42)_0%,hsl(var(--alva-accent)/0.24)_18%,hsl(var(--alva-accent)/0.12)_36%,hsl(var(--alva-accent)/0.05)_58%,hsl(var(--alva-accent)/0.015)_78%,transparent_100%)]"
        )}
      />
      <div
        className={cn(
          "absolute inset-x-0 top-0",
          isSoft
            ? "h-[48vh] min-h-[300px] bg-[radial-gradient(ellipse_90%_70%_at_50%_-8%,hsl(var(--alva-accent)/0.22),transparent_72%)]"
            : "h-[58vh] min-h-[360px] bg-[radial-gradient(ellipse_90%_70%_at_50%_-8%,hsl(var(--alva-accent)/0.34),transparent_72%)]"
        )}
      />
      <div
        className={cn(
          "absolute inset-x-0 top-0",
          isSoft
            ? "h-[38vh] min-h-[240px] bg-[radial-gradient(ellipse_55%_40%_at_50%_0%,hsl(var(--alva-accent)/0.12),transparent_68%)]"
            : "h-[48vh] min-h-[300px] bg-[radial-gradient(ellipse_55%_40%_at_50%_0%,hsl(var(--alva-accent)/0.18),transparent_68%)]"
        )}
      />
    </div>
  );
}
