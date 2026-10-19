export type InternNotificationCategory =
  | "review-queue"
  | "participant-added"
  | "session-submitted"
  | "quality-flag"
  | "payout-summary"
  | "announcement";

export type InternNotification = {
  /** False until the person has seen it. Drives the unread dot. */
  read?: boolean;
  id: string;
  category: InternNotificationCategory;
  title: string;
  subtitle: string;
  body?: string;
  timestamp: string;
  timestampTs: number;
  meta?: string[];
};

