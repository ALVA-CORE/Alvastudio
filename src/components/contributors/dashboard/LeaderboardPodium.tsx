import MedalStar from "@solar-icons/react/like/MedalStar";
import UserRounded from "@solar-icons/react/users/UserRounded";
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

/** Fades the podium into the card it is embedded in. */
function maskStyle(embedded?: boolean) {
  return embedded
    ? {
        maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
      }
    : undefined;
}

const STEPS = [
  { rank: 2 as const, blockHeight: "h-[64px] sm:h-[76px]" },
  { rank: 1 as const, blockHeight: "h-[96px] sm:h-[112px]" },
  { rank: 3 as const, blockHeight: "h-[48px] sm:h-[58px]" },
];

/** The plinth. Shared so an empty board has the same shape as a full one. */
function PodiumBlock({
  rank,
  blockHeight,
  embedded,
}: {
  rank: 1 | 2 | 3;
  blockHeight: string;
  embedded?: boolean;
}) {
  return (
    <div className={cn("relative w-full", blockHeight)}>
      <div
        className="absolute inset-x-0 bottom-0 h-[85%] rounded-t-lg"
        style={{
          background: embedded
            ? "linear-gradient(180deg, rgba(9,9,9,0.55) 0%, rgba(9,9,9,0.35) 55%, rgba(9,9,9,0) 100%)"
            : "linear-gradient(180deg, hsl(0 0% 28%) 0%, hsl(0 0% 16%) 55%, hsl(0 0% 10%) 100%)",
          boxShadow: embedded ? undefined : "inset 0 1px 0 rgba(255,255,255,0.12)",
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
  );
}

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

      <PodiumBlock rank={rank} blockHeight={blockHeight} embedded={embedded} />
    </div>
  );
}

/**
 * The same three steps, waiting.
 *
 * Built from the podium's own furniture rather than a line of text: the card
 * keeps its shape, so an empty board reads as a board nobody has reached yet
 * rather than as something that failed to load. One short word per step,
 * because three long ones at this width would each truncate.
 */
function EmptyPodiumSlot({
  rank,
  blockHeight,
  embedded,
}: {
  rank: 1 | 2 | 3;
  blockHeight: string;
  embedded?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <div className="relative mb-3 flex flex-col items-center">
        {rank === 1 && (
          <MedalStar
            size={18}
            weight="BoldDuotone"
            className={cn("mb-1", embedded ? "text-alva-bg/40" : "text-muted-foreground")}
          />
        )}
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-full border-2 border-dashed",
            embedded
              ? "border-alva-bg/25 text-alva-bg/40"
              : "border-alva-border text-muted-foreground"
          )}
        >
          <UserRounded size={20} weight="Outline" />
        </span>
        <p
          className={cn(
            "mt-2 text-center text-xs font-medium",
            embedded ? "text-alva-bg/60" : "text-muted-foreground"
          )}
        >
          Open
        </p>
      </div>

      <PodiumBlock rank={rank} blockHeight={blockHeight} embedded={embedded} />
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
     With nobody at all the three steps still stand, empty. */
  if (!first) {
    return (
      <div className={cn("relative", className)} style={maskStyle(embedded)}>
        <div className="relative flex items-end justify-center gap-1.5 px-1 sm:gap-3">
          {STEPS.map((step) => (
            <EmptyPodiumSlot
              key={step.rank}
              rank={step.rank}
              blockHeight={step.blockHeight}
              embedded={embedded}
            />
          ))}
        </div>

        <p
          className={cn(
            "mt-3 text-center text-[11px]",
            embedded ? "text-alva-bg/70" : "text-muted-foreground"
          )}
        >
          Nobody is on the board yet. Record a prompt and the top three appear here.
        </p>
      </div>
    );
  }

  /* Second on the left, first in the middle, third on the right, with the
     steps that are not filled simply absent. Height already says who won, so
     a two-person board reads correctly without a placeholder standing in for
     somebody who does not exist. */
  const byRank: Record<1 | 2 | 3, LeaderboardEntry | undefined> = {
    1: first,
    2: second,
    3: third,
  };

  const steps = STEPS.flatMap((step) => {
    const entry = byRank[step.rank];
    return entry ? [{ ...step, entry }] : [];
  });

  return (
    <div
      className={cn("relative", className)}
      style={maskStyle(embedded)}
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
