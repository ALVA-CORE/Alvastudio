import type { ContributorNotification } from "@/data/contributor-notifications";
import {
  NotificationCategoryIcon,
  NotificationStatusTag,
} from "@/components/contributors/notifications/notification-ui";
import { cn } from "@/lib/utils";

type NotificationCardProps = {
  notification: ContributorNotification;
  onClick: () => void;
  className?: string;
};

export function NotificationCard({ notification, onClick, className }: NotificationCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 py-3.5 text-left transition-colors hover:opacity-90 active:opacity-80",
        className
      )}
    >
      <NotificationCategoryIcon category={notification.category} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{notification.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {notification.subtitle}
        </p>
      </div>

      {notification.status ? (
        <NotificationStatusTag status={notification.status} />
      ) : null}
    </button>
  );
}
