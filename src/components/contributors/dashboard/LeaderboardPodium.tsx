import MedalStar from "@solar-icons/react/like/MedalStar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { diceBearAvatarUrl } from "@/lib/dicebear";
import type { LeaderboardEntry } from "@/data/contributors/dashboard";
import { cn } from "@/lib/utils";

type PodiumSlotProps = {
  entry: LeaderboardEntry;
  rank: 1 | 2 | 3;
  blockHeight: string;
  isCurrentUser?: boolean;
  embedded?: boolean;
};

function PodiumSlot({
  entry,
  rank,
  blockHeight,
  isCurrentUser,
  embedded,
}: PodiumSlotProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <div className="relative mb-3 flex flex-col items-center">
        {rank === 1 && (
          <MedalStar
            size={18}
            weight="BoldDuotone"
            className={cn(
              "mb-1",
              embedded ? "text-alva-bg" : "text-alva-accent"
            )}
          />
        )}
        <Avatar
          className={cn(
            "size-11 border-2",
            isCurrentUser
              ? embedded
                ? "border-alva-bg"
                : "border-alva-accent"
              : embedded
                ? "border-alva-bg/30"
                : "border-alva-border"
          )}
        >
          <AvatarImage
            src={diceBearAvatarUrl(entry.seed, entry.avatarBg)}
            alt={entry.name}
          />
          <AvatarFallback className="bg-alva-card text-xs font-medium text-foreground">
            {entry.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {/* First name only. A podium is three faces at a glance, and a full
            name truncates to a surname fragment at this width. */}
        <p
          className={cn(
            "mt-2 max-w-[88px] truncate text-center text-xs font-medium",
            embedded ? "text-alva-bg" : "text-foreground"
          )}
        >
          {entry.name.trim().split(/\s+/)[0]}
        </p>
        <span
          className={cn(
            "mt-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium",
            embedded
              ? "bg-alva-bg/20 text-alva-bg/90"
              : "bg-alva-surface text-muted-foreground"
          )}
        >
          {entry.points.toLocaleString()} pts
        </span>
      </div>

      <div className={cn("relative w-full", blockHeight)}>
        <div
          className="absolute inset-x-0 bottom-0 h-[85%] rounded-t-lg"
          style={{
            background: embedded
              ? "linear-gradient(180deg, rgba(9,9,9,0.55) 0%, rgba(9,9,9,0.35) 55%, rgba(9,9,9,0) 100%)"
              : "linear-gradient(180deg, hsl(0 0% 28%) 0%, hsl(0 0% 16%) 55%, hsl(0 0% 10%) 100%)",
            boxShadow: embedded
              ? undefined
              : "inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          {!embedded && (
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-2 rounded-t-lg bg-gradient-to-b from-white/10 to-transparent"
            />
          )}
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center text-4xl font-bold",
              embedded ? "text-alva-bg/25" : "text-white/20"
            )}
          >
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
  embedded?: boolean;
};

export function LeaderboardPodium({
  currentUserId,
  entries,
  className,
  embedded = false,
}: LeaderboardPodiumProps) {
  const [first, second, third] = entries ?? [];

  /* Nobody ranked yet. One or two is fine — an early corpus genuinely has one
     person on it, and hiding the board until a third arrived was why it
     vanished rather than showing the one person who was on it.
     With nobody at all, say so: a card that simply ends under the balance
     looks like something failed to load. */
  if (!first) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-1 px-4 pb-6 pt-5 text-center",
          className
        )}
      >
        <MedalStar
          size={20}
          weight="BoldDuotone"
          className={embedded ? "text-alva-bg/70" : "text-muted-foreground"}
        />
        <p
          className={cn(
            "text-xs font-medium",
            embedded ? "text-alva-bg" : "text-foreground"
          )}
        >
          Nobody on the board yet
        </p>
        <p
          className={cn(
            "max-w-[16rem] text-[11px] leading-relaxed",
            embedded ? "text-alva-bg/70" : "text-muted-foreground"
          )}
        >
          The top three appear here once contributors start earning points.
        </p>
      </div>
    );
  }

  /* Second on the left, first in the middle, third on the right, with the
     steps that are not filled simply absent. Height already says who won, so
     a two-person board reads correctly without a placeholder standing in for
     somebody who does not exist. */
  const steps = [
    second && { entry: second, rank: 2 as const, blockHeight: "h-[64px] sm:h-[76px]" },
    { entry: first, rank: 1 as const, blockHeight: "h-[96px] sm:h-[112px]" },
    third && { entry: third, rank: 3 as const, blockHeight: "h-[48px] sm:h-[58px]" },
  ].filter(Boolean) as {
    entry: LeaderboardEntry;
    rank: 1 | 2 | 3;
    blockHeight: string;
  }[];

  return (
    <div
      className={cn("relative", className)}
      style={
        embedded
          ? {
              maskImage:
                "linear-gradient(to bottom, black 50%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 50%, transparent 100%)",
            }
          : undefined
      }
    >
      {!embedded && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-alva-bg via-alva-bg/80 to-transparent"
        />
      )}

      <div className="relative flex items-end justify-center gap-1.5 px-1 sm:gap-3">
        {steps.map((step) => (
          <PodiumSlot
            key={step.entry.id}
            entry={step.entry}
            rank={step.rank}
            blockHeight={step.blockHeight}
            isCurrentUser={step.entry.id === currentUserId}
            embedded={embedded}
          />
        ))}
      </div>
    </div>
  );
}
