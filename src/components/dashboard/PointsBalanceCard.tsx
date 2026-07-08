import { cn } from "@/lib/utils";
import { alvaAccentTexture } from "@/lib/alva-texture";

type PointsBalanceCardProps = {
  points: number;
  className?: string;
};

export function PointsBalanceCard({ points, className }: PointsBalanceCardProps) {
  const formatted = new Intl.NumberFormat("en-NG").format(points);

  return (
    <section
      className={cn(
        alvaAccentTexture(
          "mx-4 flex min-h-[12.5vh] flex-col justify-center rounded-2xl px-5 py-4"
        ),
        className
      )}
    >
      <p className="relative z-[1] text-sm font-medium text-alva-bg/70">
        Points balance
      </p>
      <p className="relative z-[1] mt-1 text-3xl font-semibold tracking-tight text-alva-bg">
        {formatted}
        <span className="ml-1.5 text-lg font-medium text-alva-bg/75">pts</span>
      </p>
    </section>
  );
}
