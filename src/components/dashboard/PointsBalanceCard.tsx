import { LeaderboardPodium } from "@/components/dashboard/LeaderboardPodium";
import { TextureButton } from "@/components/ui/texture-button";
import { alvaAccentTexture } from "@/lib/alva-texture";
import { cn } from "@/lib/utils";

type PointsBalanceCardProps = {
  points: number;
  currentUserId?: string;
  className?: string;
};

export function PointsBalanceCard({
  points,
  currentUserId,
  className,
}: PointsBalanceCardProps) {
  const formatted = new Intl.NumberFormat("en-NG").format(points);

  return (
    <section
      className={cn(
        alvaAccentTexture("mx-4 overflow-hidden rounded-2xl px-5 pb-0 pt-4"),
        className
      )}
    >
      <div className="relative z-[1] flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-alva-bg/70">Points balance</p>
          <p className="mt-0.5 text-3xl font-semibold tracking-tight text-alva-bg">
            {formatted}
            <span className="ml-1.5 text-lg font-medium text-alva-bg/75">pts</span>
          </p>
        </div>
        <TextureButton variant="primary" size="sm" className="w-auto shrink-0">
          Point log
        </TextureButton>
      </div>

      <LeaderboardPodium
        embedded
        currentUserId={currentUserId}
        className="relative z-[1] -mx-2 mt-4"
      />
    </section>
  );
}
