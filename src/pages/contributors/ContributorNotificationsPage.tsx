import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ArrowLeft from "@solar-icons/react/arrows/ArrowLeft";
import Tuning2 from "@solar-icons/react/settings/Tuning2";
import Bell from "@solar-icons/react/notifications/Bell";
import Magnifier from "@solar-icons/react/search/Magnifier";
import { NotificationCard } from "@/components/contributors/notifications/NotificationCard";
import { NotificationDetailSheet } from "@/components/contributors/notifications/NotificationDetailSheet";
import { FixedBlurHeader } from "@/components/shared/FixedBlurHeader";
import { AlvaEmptyState } from "@/components/shared/states/AlvaEmptyState";
import { AlvaNoResultsState } from "@/components/shared/states/AlvaNoResultsState";
import { AlvaSurfaceCard } from "@/components/shared/AlvaSurfaceCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  filterNotifications,
  loadContributorNotifications,
  sortNotifications,
  type ContributorNotification,
  type NotificationSort,
} from "@/data/contributor-notifications";
import { useDevRows, useSimulatedLoading } from "@/hooks/use-dev-ui-state";

const SORT_LABELS: Record<NotificationSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  accepted: "Accepted first",
  rejected: "Rejected first",
};

export default function ContributorNotificationsPage() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<NotificationSort>("newest");
  const [selected, setSelected] = useState<ContributorNotification | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isLoading = useSimulatedLoading();

  const notifications = useDevRows(useMemo(() => loadContributorNotifications(), []));

  const visibleNotifications = useMemo(() => {
    const filtered = filterNotifications(notifications, query);
    return sortNotifications(filtered, sort);
  }, [notifications, query, sort]);

  const isNullState = notifications.length === 0;
  const isNoResults = !isNullState && visibleNotifications.length === 0 && query.trim().length > 0;

  const handleOpen = (notification: ContributorNotification) => {
    setSelected(notification);
    setSheetOpen(true);
  };

  return (
    <div className="pb-6">
      <FixedBlurHeader contentClassName="pb-4">
        <div className="relative flex items-center justify-center">
          <Link
            to="/contributor/dashboard"
            aria-label="Back to dashboard"
            className="absolute left-0 inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={22} weight="Outline" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Notifications</h1>
        </div>
      </FixedBlurHeader>

      <div className="px-4">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Magnifier
              size={16}
              weight="Outline"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notifications"
              className="h-10 rounded-full border-0 bg-alva-surface pl-9 shadow-none focus-visible:ring-1 focus-visible:ring-alva-accent"
              aria-label="Search notifications"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="size-10 shrink-0 rounded-full bg-alva-surface"
                aria-label="Sort notifications"
              >
                <Tuning2 size={18} weight="Outline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 border-alva-border bg-alva-card">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Sort by
              </DropdownMenuLabel>
              {(Object.keys(SORT_LABELS) as NotificationSort[]).map((option) => (
                <DropdownMenuCheckboxItem
                  key={option}
                  checked={sort === option}
                  onCheckedChange={() => setSort(option)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {SORT_LABELS[option]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-4 px-4">
        <AlvaSurfaceCard className="px-4 py-1">
          {isLoading ? (
            <div className="space-y-3 py-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 py-2">
                  <Skeleton className="size-10 shrink-0 rounded-full bg-alva-surface" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-32 rounded-full bg-alva-surface" />
                    <Skeleton className="h-3 w-full rounded-full bg-alva-surface" />
                  </div>
                </div>
              ))}
            </div>
          ) : isNullState ? (
            <AlvaEmptyState
              icon={<Bell size={20} weight="Outline" />}
              title="No notifications yet"
              description="Updates on reviews, payouts, and announcements will show up here."
              compact
            />
          ) : isNoResults ? (
            <AlvaNoResultsState query={query} />
          ) : (
            <div>
              {visibleNotifications.map((notification, index) => (
                <div key={notification.id}>
                  <NotificationCard
                    notification={notification}
                    onClick={() => handleOpen(notification)}
                  />
                  {index < visibleNotifications.length - 1 ? (
                    <Separator className="mx-4 bg-alva-border" />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </AlvaSurfaceCard>
      </div>

      <NotificationDetailSheet
        notification={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
