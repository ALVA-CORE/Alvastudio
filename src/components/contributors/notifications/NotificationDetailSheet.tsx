import {
  QUALITY_QUESTIONS,
  TRI_STATE_OPTIONS,
} from "@/data/reviewQueue";
import {
  getNotificationDetailMeta,
  getRubricFeedback,
  type ContributorNotification,
} from "@/data/contributor-notifications";
import {
  DotSeparatedMeta,
  NotificationStatusTag,
  StackedMetaLines,
} from "@/components/contributors/notifications/notification-ui";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type NotificationDetailSheetProps = {
  notification: ContributorNotification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NotificationDetailSheet({
  notification,
  open,
  onOpenChange,
}: NotificationDetailSheetProps) {
  if (!notification) return null;

  const metaItems = getNotificationDetailMeta(notification);
  const rubricIssues =
    notification.answers && notification.status === "rejected"
      ? getRubricFeedback(notification.answers)
      : [];

  const rubricSummary =
    notification.answers && notification.category.startsWith("review")
      ? QUALITY_QUESTIONS.map((question) => {
          const value = notification.answers?.[question.id];
          const label =
            TRI_STATE_OPTIONS.find((option) => option.value === value)?.label ?? "—";
          return `${question.label}: ${label}`;
        })
      : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-[28px] border-alva-border bg-alva-card px-5 pb-8 pt-8"
      >
        <SheetHeader className="space-y-3 pr-8 text-left">
          <div className="flex items-start justify-between gap-3">
            <SheetTitle className="text-xl text-foreground">{notification.title}</SheetTitle>
            {notification.status ? <NotificationStatusTag status={notification.status} /> : null}
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <DotSeparatedMeta items={metaItems} />

          {(notification.prompt || notification.body) && (
            <p className="text-sm leading-relaxed text-foreground">
              {notification.prompt ?? notification.body}
            </p>
          )}

          {rubricSummary.length > 0 ? <StackedMetaLines items={rubricSummary} /> : null}

          {rubricIssues.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Rejection reasons
              </p>
              <StackedMetaLines
                items={rubricIssues.map((issue) => `${issue.question} (${issue.answer})`)}
              />
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
