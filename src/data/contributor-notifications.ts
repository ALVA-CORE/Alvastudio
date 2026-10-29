import {
  QUALITY_QUESTIONS,
  TRI_STATE_OPTIONS,
  type QualityAnswers,
} from "@/data/reviewQueue";

export type NotificationCategory =
  | "review-accepted"
  | "review-rejected"
  | "submission-received"
  | "payout"
  /**
   * Their identity check needs redoing.
   *
   * Its own category rather than an announcement: it is the only
   * notification that stands between somebody and being paid, and it stays
   * until they act on it. An envelope beside "we have updated our terms"
   * would be the wrong weight entirely.
   */
  | "identity"
  | "announcement"
  | "leaderboard";

export type NotificationStatus = "accepted" | "rejected" | "pending";

export type ContributorNotification = {
  /** False until the person has seen it. Drives the unread dot. */
  read?: boolean;
  id: string;
  category: NotificationCategory;
  title: string;
  subtitle: string;
  timestamp: string;
  timestampTs: number;
  status?: NotificationStatus;
  prompt?: string;
  duration?: string;
  mode?: string;
  language?: string;
  device?: string;
  answers?: QualityAnswers;
  amount?: string;
  body?: string;
  leaderboardMonth?: string;
  leaderboardPoints?: number;
};

export type RubricFeedbackItem = {
  questionId: keyof Omit<QualityAnswers, "verdict">;
  question: string;
  answer: string;
};

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  accepted: "Accepted",
  rejected: "Rejected",
  pending: "Pending",
};

export function getRubricFeedback(answers: QualityAnswers): RubricFeedbackItem[] {
  return QUALITY_QUESTIONS.flatMap((question) => {
    const value = answers[question.id];
    if (value !== "no" && value !== "partial") return [];

    const answer =
      TRI_STATE_OPTIONS.find((option) => option.value === value)?.label ?? value;

    return [
      {
        questionId: question.id,
        question: question.label,
        answer,
      },
    ];
  });
}

export type NotificationDetailRow = { label: string; value: string };

/**
 * The notification's facts as labelled rows.
 *
 * Replaces the dot-joined string this used to return. "Today, 9:12 AM · 0:14 ·
 * Prompt reader · Nigerian English · iPhone 14" asks the reader to work out
 * which fact is which from its shape alone; the labels are what the profile
 * sheets carry, and the two are the same kind of panel. Absent fields drop out
 * rather than rendering an em dash, so a payout does not show four blank audio
 * rows.
 */
export function getNotificationDetailRows(
  notification: ContributorNotification
): NotificationDetailRow[] {
  return [
    { label: "Received", value: notification.timestamp },
    { label: "Duration", value: notification.duration },
    { label: "Mode", value: notification.mode },
    { label: "Language", value: notification.language },
    { label: "Device", value: notification.device },
    { label: "Amount", value: notification.amount },
    { label: "Month", value: notification.leaderboardMonth },
    {
      label: "Points",
      value: notification.leaderboardPoints
        ? `${notification.leaderboardPoints.toLocaleString()} pts`
        : undefined,
    },
  ].filter((row): row is NotificationDetailRow => Boolean(row.value));
}

export type NotificationSort = "newest" | "oldest" | "accepted" | "rejected";

export function sortNotifications(
  notifications: ContributorNotification[],
  sort: NotificationSort
) {
  const next = [...notifications];

  switch (sort) {
    case "oldest":
      return next.sort((a, b) => a.timestampTs - b.timestampTs);
    case "accepted":
      return next.sort((a, b) => {
        const aAccepted = a.status === "accepted" ? 1 : 0;
        const bAccepted = b.status === "accepted" ? 1 : 0;
        if (aAccepted !== bAccepted) return bAccepted - aAccepted;
        return b.timestampTs - a.timestampTs;
      });
    case "rejected":
      return next.sort((a, b) => {
        const aRejected = a.status === "rejected" ? 1 : 0;
        const bRejected = b.status === "rejected" ? 1 : 0;
        if (aRejected !== bRejected) return bRejected - aRejected;
        return b.timestampTs - a.timestampTs;
      });
    default:
      return next.sort((a, b) => b.timestampTs - a.timestampTs);
  }
}

export function filterNotifications(
  notifications: ContributorNotification[],
  query: string
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return notifications;

  return notifications.filter((notification) =>
    [
      notification.title,
      notification.subtitle,
      notification.category,
      notification.status,
      notification.prompt,
      notification.body,
      notification.mode,
      notification.language,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalized)
  );
}
