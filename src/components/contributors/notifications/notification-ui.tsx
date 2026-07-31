import type { ReactNode } from "react";
import { BorderBeam } from "border-beam";
import CupStar from "@solar-icons/react/ui/CupStar";
import ClipboardList from "@solar-icons/react/notes/ClipboardList";
import Letter from "@solar-icons/react/messages/Letter";
import Wallet from "@solar-icons/react/money/Wallet";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import ShieldWarning from "@solar-icons/react/security/ShieldWarning";
import type { InternNotificationCategory } from "@/data/intern-notifications";
import {
  NOTIFICATION_STATUS_LABELS,
  type NotificationCategory,
  type NotificationStatus,
} from "@/data/contributor-notifications";
import { cn } from "@/lib/utils";

const AUDIO_CATEGORIES = new Set<NotificationCategory>([
  "review-accepted",
  "review-rejected",
  "submission-received",
]);

const CATEGORY_ICONS: Record<
  Exclude<NotificationCategory, "review-accepted" | "review-rejected" | "submission-received">,
  ReactNode
> = {
  payout: <Wallet size={18} weight="Bold" />,
  announcement: <Letter size={18} weight="Bold" />,
  leaderboard: <CupStar size={18} weight="Bold" />,
};

const INTERN_CATEGORY_ICONS: Record<InternNotificationCategory, ReactNode> = {
  "review-queue": <ClipboardList size={18} weight="Bold" />,
  "participant-added": <UsersGroupRounded size={18} weight="Bold" />,
  "session-submitted": <Microphone3 size={18} weight="Bold" />,
  "quality-flag": <ShieldWarning size={18} weight="Bold" />,
  "payout-summary": <Wallet size={18} weight="Bold" />,
  announcement: <Letter size={18} weight="Bold" />,
};

function getContributorCategoryIcon(category: NotificationCategory) {
  if (AUDIO_CATEGORIES.has(category)) {
    return <Microphone3 size={18} weight="Bold" />;
  }

  return CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];
}

type NotificationIconBadgeProps = {
  icon: ReactNode;
  className?: string;
};

export function NotificationIconBadge({ icon, className }: NotificationIconBadgeProps) {
  return (
    <BorderBeam
      size="pulse-inner"
      colorVariant="mono"
      theme="dark"
      active
      duration={2.3}
      strength={0.85}
      className={cn("size-10 shrink-0 rounded-full", className)}
    >
      <div className="flex size-full items-center justify-center rounded-full bg-alva-surface text-muted-foreground">
        {icon}
      </div>
    </BorderBeam>
  );
}

export function NotificationCategoryIcon({
  category,
  className,
}: {
  category: NotificationCategory;
  className?: string;
}) {
  return (
    <NotificationIconBadge
      icon={getContributorCategoryIcon(category)}
      className={className}
    />
  );
}

export function InternNotificationCategoryIcon({
  category,
  className,
}: {
  category: InternNotificationCategory;
  className?: string;
}) {
  return (
    <NotificationIconBadge icon={INTERN_CATEGORY_ICONS[category]} className={className} />
  );
}

export function NotificationStatusTag({ status }: { status: NotificationStatus }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        status === "accepted" && "bg-alva-accent/15 text-alva-accent",
        status === "rejected" && "bg-red-500/15 text-red-400",
        status === "pending" && "bg-amber-500/15 text-amber-300"
      )}
    >
      {NOTIFICATION_STATUS_LABELS[status]}
    </span>
  );
}

export function DotSeparatedMeta({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <p className="text-sm leading-relaxed text-muted-foreground">{items.join(" · ")}</p>
  );
}

export function StackedMetaLines({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <p key={item} className="text-sm leading-relaxed text-muted-foreground">
          {item}
        </p>
      ))}
    </div>
  );
}
