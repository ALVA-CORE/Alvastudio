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
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications } from "@/hooks/useNotifications";
import { toStaffNotification } from "@/data/notifications";
import type { InternNotification } from "@/data/intern-notifications";
import { cn } from "@/lib/utils";

function MenuItem({
  notification,
  onOpen,
}: {
  notification: InternNotification;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full px-4 py-3.5 text-left transition-colors hover:bg-alva-surface/60 focus-visible:outline-none focus-visible:bg-alva-surface/60"
    >
      <div className="flex items-start gap-3">
        <InternNotificationCategoryIcon category={notification.category} />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {notification.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {notification.subtitle}
              </p>
            </div>

            {/* A dot, not a pill. The row is already the thing being read. */}
            {notification.read ? null : (
              <span
                aria-label="Unread"
                className="mt-1.5 size-2 shrink-0 rounded-full bg-alva-accent"
              />
            )}
          </div>

          {notification.body ? (
            <p className="text-sm leading-relaxed text-foreground/90">
              {notification.body}
            </p>
          ) : null}

          {notification.meta && notification.meta.length > 0 ? (
            <StackedMetaLines items={notification.meta} />
          ) : null}

          <p className="text-xs text-muted-foreground">{notification.timestamp}</p>
        </div>
      </div>
    </button>
  );
}

/**
 * The bell, for the two staff roles.
 *
 * Interns and annotators get the same list from the same endpoint, so they get
 * the same menu. Contributors have their own screen instead, because theirs
 * carries the review rubric and a dropdown is the wrong place to read a
 * verdict.
 *
 * Opening the menu does not mark anything read. Someone glancing at a bell to
 * see whether it is worth opening has not read anything, and clearing the
 * badge on that glance loses the one signal they came for.
 */
export function NotificationsMenu({ className }: { className?: string }) {
  const { items, unread, isLoading, error, markOneRead, markAllRead } =
    useNotifications({ limit: 30 });

  const notifications = useMemo(() => items.map(toStaffNotification), [items]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className={cn(
            "relative size-10 shrink-0 rounded-full bg-alva-surface text-muted-foreground hover:text-foreground",
            className
          )}
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell size={20} weight="Outline" />
          {/* A count, not a dot. "You have something" is a weaker prompt than
              "you have nine", and the number is what decides whether this is
              worth opening now. Past 99 the exact figure stops mattering. */}
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-alva-accent px-1 text-[10px] font-semibold tabular-nums text-alva-bg ring-2 ring-alva-bg">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(28rem,calc(100vw-2rem))] border-alva-border bg-alva-card p-0"
      >
        <div className="flex items-center justify-between gap-3 border-b border-alva-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {unread > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="rounded-full px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
            >
              Mark all read
            </button>
          ) : null}
        </div>

        <div className="alva-thin-scrollbar max-h-[min(28rem,70vh)] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-start gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <p role="alert" className="px-4 py-8 text-center text-xs text-red-400">
              {error}
            </p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              Nothing yet. Updates on your work appear here.
            </p>
          ) : (
            notifications.map((notification, index) => (
              <div key={notification.id}>
                <MenuItem
                  notification={notification}
                  onOpen={() => void markOneRead(notification.id)}
                />
                {index < notifications.length - 1 ? (
                  <Separator className="mx-4 bg-alva-border" />
                ) : null}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
