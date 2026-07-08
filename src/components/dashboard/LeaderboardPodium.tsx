import MedalStar from "@solar-icons/react/like/MedalStar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type LeaderboardEntry = {
  id: string;
  name: string;
  points: number;
  initials: string;
};

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { id: "2", name: "Adaeze Okafor", points: 1180, initials: "AO" },
  { id: "1", name: "Okonkwo James", points: 1420, initials: "OJ" },
  { id: "3", name: "Chioma Eze", points: 960, initials: "CE" },
];

type PodiumSlotProps = {
  entry: LeaderboardEntry;
  rank: 1 | 2 | 3;
  blockHeight: string;
  isCurrentUser?: boolean;
};

function PodiumSlot({ entry, rank, blockHeight, isCurrentUser }: PodiumSlotProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <div className="relative mb-3 flex flex-col items-center">
        {rank === 1 && (
          <MedalStar
            size={18}
            weight="BoldDuotone"
            className="mb-1 text-alva-accent"
          />
        )}
        <Avatar
          className={cn(
            "size-11 border-2",
            isCurrentUser ? "border-alva-accent" : "border-alva-border"
          )}
        >
          <AvatarFallback className="bg-alva-card text-xs font-medium text-foreground">
            {entry.initials}
          </AvatarFallback>
        </Avatar>
        <p className="mt-2 max-w-[88px] truncate text-center text-xs font-medium text-foreground">
          {entry.name}
        </p>
        <span className="mt-1.5 rounded-full bg-alva-surface px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {entry.points.toLocaleString()} pts
        </span>
      </div>

      <div className={cn("relative w-full", blockHeight)}>
        <div
          className="absolute inset-x-0 bottom-0 h-[85%] rounded-t-md"
          style={{
            background:
              "linear-gradient(180deg, hsl(0 0% 28%) 0%, hsl(0 0% 16%) 55%, hsl(0 0% 10%) 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-2 rounded-t-md bg-gradient-to-b from-white/10 to-transparent"
          />
          <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-white/20">
            {rank}
          </span>
        </div>
      </div>
    </div>
  );
}

type LeaderboardPodiumProps = {
  currentUserId?: string;
  entries?: LeaderboardEntry[];
  className?: string;
};

export function LeaderboardPodium({
  currentUserId,
  entries = MOCK_LEADERBOARD,
  className,
}: LeaderboardPodiumProps) {
  const [second, first, third] = entries;

  return (
    <section className={cn("relative mt-6 px-4", className)}>
      <h2 className="mb-4 text-sm font-medium text-muted-foreground">
        Leaderboard
      </h2>

      <div
        className="relative overflow-hidden rounded-2xl bg-alva-bg pb-2 pt-6"
        style={{
          maskImage:
            "linear-gradient(to bottom, black 55%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 55%, transparent 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-alva-bg via-alva-bg/80 to-transparent"
        />

        <div className="relative flex items-end justify-center gap-1.5 px-2 sm:gap-3">
          <PodiumSlot
            entry={second}
            rank={2}
            blockHeight="h-[72px] sm:h-[88px]"
            isCurrentUser={second.id === currentUserId}
          />
          <PodiumSlot
            entry={first}
            rank={1}
            blockHeight="h-[108px] sm:h-[128px]"
            isCurrentUser={first.id === currentUserId}
          />
          <PodiumSlot
            entry={third}
            rank={3}
            blockHeight="h-[56px] sm:h-[68px]"
            isCurrentUser={third.id === currentUserId}
          />
        </div>
      </div>
    </section>
  );
}
