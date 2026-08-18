import { useMemo } from "react";
import Bell from "@solar-icons/react/notifications/Bell";
import {
  InternNotificationCategoryIcon,
  StackedMetaLines,
} from "@/components/contributors/notifications/notification-ui";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { loadInternNotifications, type InternNotification } from "@/data/intern-notifications";
import { cn } from "@/lib/utils";

function InternNotificationMenuItem({ notification }: { notification: InternNotification }) {
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-start gap-3">
        <InternNotificationCategoryIcon category={notification.category} />

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-medium text-foreground">{notification.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{notification.subtitle}</p>
          </div>

          {notification.body ? (
            <p className="text-sm leading-relaxed text-foreground/90">{notification.body}</p>
          ) : null}

          {notification.meta && notification.meta.length > 0 ? (
            <StackedMetaLines items={notification.meta} />
          ) : null}

          <p className="text-xs text-muted-foreground">{notification.timestamp}</p>
        </div>
      </div>
    </div>
  );
}

type InternNotificationsMenuProps = {
  className?: string;
};

export function InternNotificationsMenu({ className }: InternNotificationsMenuProps) {
  const notifications = useMemo(() => loadInternNotifications(), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className={cn(
            "size-10 shrink-0 rounded-full bg-alva-surface text-muted-foreground hover:text-foreground",
            className
          )}
          aria-label="Notifications"
        >
          <Bell size={20} weight="Outline" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(28rem,calc(100vw-2rem))] border-alva-border bg-alva-card p-0"
      >
        <div className="border-b border-alva-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
        </div>

        <div className="alva-thin-scrollbar max-h-[min(28rem,70vh)] overflow-y-auto">
          {notifications.map((notification, index) => (
            <div key={notification.id}>
              <InternNotificationMenuItem notification={notification} />
              {index < notifications.length - 1 ? (
                <Separator className="mx-4 bg-alva-border" />
              ) : null}
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
