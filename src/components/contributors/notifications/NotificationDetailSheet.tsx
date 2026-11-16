import { QUALITY_QUESTIONS, TRI_STATE_OPTIONS } from "@/data/reviewQueue";
import {
  getNotificationDetailRows,
  getRubricFeedback,
  type ContributorNotification,
} from "@/data/contributor-notifications";
import {
  NotificationActionButton,
  NotificationStatusTag,
} from "@/components/contributors/notifications/notification-ui";
import { PanelDivider, PanelRow, PanelSection } from "@/components/shared/PanelPrimitives";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { NO_VALUE } from "@/lib/no-value";

type NotificationDetailSheetProps = {
  notification: ContributorNotification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Bottom sheet for one notification.
 *
 * Carries the same grammar as the profile sheets: labelled rows on hairlines,
 * a heavier full-bleed rule between topics, no filled boxes. It used to render
 * its facts as one dot-joined sentence and its rubric answers as loose lines,
 * which read as prose in a panel that is really a table.
 */
export function NotificationDetailSheet({
  notification,
  open,
  onOpenChange,
}: NotificationDetailSheetProps) {
  if (!notification) return null;

  const detailRows = getNotificationDetailRows(notification);

  const rubricIssues =
    notification.answers && notification.status === "rejected"
      ? getRubricFeedback(notification.answers)
      : [];

  const rubricRows =
    notification.answers && notification.category.startsWith("review")
      ? QUALITY_QUESTIONS.map((question) => ({
          label: question.label,
          value:
            TRI_STATE_OPTIONS.find(
              (option) => option.value === notification.answers?.[question.id]
            )?.label ?? NO_VALUE,
        }))
      : [];


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-[28px] border-alva-border bg-alva-card px-4 pb-8 pt-8"
      >
        {/* Centred, as the profile sheets: padded both sides to clear the
            close button. */}
        <SheetHeader className="items-center px-10 text-center sm:text-center">
          <SheetTitle className="text-xl text-foreground">{notification.title}</SheetTitle>
          {notification.status ? <NotificationStatusTag status={notification.status} /> : null}
        </SheetHeader>

        {/* The message is the one piece of prose here, so it sits above the
            rules rather than inside a labelled section. Plain text with its
            line breaks: an announcement is written that way. */}
        {notification.body ? (
          <p className="mt-3 whitespace-pre-line text-center text-sm leading-relaxed text-muted-foreground">
            {notification.body}
          </p>
        ) : null}

        {notification.action ? (
          <div className="mt-5 flex justify-center">
            <NotificationActionButton action={notification.action} />
          </div>
        ) : null}

        {/* What was read, for a review: the subject of the verdict. */}
        {notification.prompt ? (
          <>
            <PanelDivider />
            <PanelSection title="What you read">
              <p className="text-sm leading-relaxed text-foreground">{notification.prompt}</p>
            </PanelSection>
          </>
        ) : null}

        {detailRows.length > 0 ? (
          <>
            <PanelDivider />
            <PanelSection title="Details">
              <dl>
                {detailRows.map((row) => (
                  <PanelRow key={row.label} label={row.label} value={row.value} />
                ))}
              </dl>
            </PanelSection>
          </>
        ) : null}

        {rubricRows.length > 0 ? (
          <>
            <PanelDivider />
            <PanelSection title="Review answers">
              <dl>
                {rubricRows.map((row) => (
                  <PanelRow key={row.label} label={row.label} value={row.value} />
                ))}
              </dl>
            </PanelSection>
          </>
        ) : null}

        {rubricIssues.length > 0 ? (
          <>
            <PanelDivider />
            <PanelSection title="Rejection reasons">
              <dl>
                {rubricIssues.map((issue) => (
                  <PanelRow
                    key={issue.questionId}
                    label={issue.question}
                    value={issue.answer}
                  />
                ))}
              </dl>
            </PanelSection>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
