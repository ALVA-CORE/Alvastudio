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
  | "announcement"
  | "leaderboard";

export type NotificationStatus = "accepted" | "rejected" | "pending";

export type ContributorNotification = {
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

export function truncateText(text: string, maxLength = 72) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

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

export function getNotificationDetailMeta(notification: ContributorNotification) {
  return [
    notification.timestamp,
    notification.duration,
    notification.mode,
    notification.language,
    notification.device,
    notification.amount,
    notification.leaderboardMonth,
    notification.leaderboardPoints
      ? `${notification.leaderboardPoints.toLocaleString()} pts`
      : undefined,
  ].filter(Boolean) as string[];
}

const MOCK_NOTIFICATIONS: ContributorNotification[] = [
  {
    id: "n-001",
    category: "review-accepted",
    title: "Recording accepted",
    subtitle:
      "The traffic for Lagos island go always choke by seven a.m., especially when rain fall.",
    timestamp: "Today, 9:12 AM",
    timestampTs: Date.now() - 1000 * 60 * 60 * 2,
    status: "accepted",
    prompt:
      "The traffic for Lagos island go always choke by seven a.m., especially when rain fall.",
    duration: "0:14",
    mode: "Prompt reader",
    language: "Nigerian English",
    device: "iPhone 14",
    answers: {
      noiseFree: "yes",
      audible: "yes",
      matchesPrompt: "yes",
      natural: "yes",
      verdict: "approve",
    },
  },
  {
    id: "n-002",
    category: "review-rejected",
    title: "Recording rejected",
    subtitle:
      "Tell us about a time network failure affected your work or school and how you handled it.",
    timestamp: "Yesterday, 4:40 PM",
    timestampTs: Date.now() - 1000 * 60 * 60 * 28,
    status: "rejected",
    prompt:
      "Tell us about a time network failure affected your work or school and how you handled it.",
    duration: "0:10",
    mode: "Prompt reader",
    language: "Nigerian Pidgin",
    device: "Samsung A54",
    answers: {
      noiseFree: "no",
      audible: "partial",
      matchesPrompt: "yes",
      natural: "yes",
      verdict: "reject",
    },
  },
  {
    id: "n-003",
    category: "submission-received",
    title: "Submission received",
    subtitle:
      "She dey always reach office before anybody else for her team, even on Monday morning.",
    timestamp: "Yesterday, 11:05 AM",
    timestampTs: Date.now() - 1000 * 60 * 60 * 36,
    status: "pending",
    prompt:
      "She dey always reach office before anybody else for her team, even on Monday morning.",
    duration: "0:12",
    mode: "Stimuli",
    language: "Yoruba-English mix",
    device: "Pixel 7",
  },
  {
    id: "n-004",
    category: "payout",
    title: "Payout sent",
    subtitle: "₦12,500 transferred to your linked account",
    timestamp: "2 days ago",
    timestampTs: Date.now() - 1000 * 60 * 60 * 52,
    amount: "₦12,500",
    body: "Your March payout has been processed and should arrive within one business day.",
  },
  {
    id: "n-005",
    category: "announcement",
    title: "New prompt pack available",
    subtitle: "Pidgin commute phrases are live in Studio this week",
    timestamp: "3 days ago",
    timestampTs: Date.now() - 1000 * 60 * 60 * 80,
    body: "Record five new commute prompts before Sunday to unlock a bonus multiplier on accepted clips.",
  },
  {
    id: "n-006",
    category: "leaderboard",
    title: "Leaderboard topper",
    subtitle: "You finished #1 on the March contributor board",
    timestamp: "4 days ago",
    timestampTs: Date.now() - 1000 * 60 * 60 * 100,
    leaderboardMonth: "March 2026",
    leaderboardPoints: 1420,
    body: "You led the board with the highest accepted clip count and quality score this month.",
  },
  {
    id: "n-007",
    category: "review-rejected",
    title: "Recording rejected",
    subtitle:
      "Explain one market phrase you hear every week in your neighborhood and what it means.",
    timestamp: "5 days ago",
    timestampTs: Date.now() - 1000 * 60 * 60 * 120,
    status: "rejected",
    prompt:
      "Explain one market phrase you hear every week in your neighborhood and what it means.",
    duration: "0:11",
    mode: "Stimuli",
    language: "Igbo-English mix",
    device: "iPhone 13",
    answers: {
      noiseFree: "partial",
      audible: "no",
      matchesPrompt: "yes",
      natural: "partial",
      verdict: "reject",
    },
  },
  {
    id: "n-008",
    category: "submission-received",
    title: "Submission received",
    subtitle: "How do you greet elders in your community when you arrive?",
    timestamp: "6 days ago",
    timestampTs: Date.now() - 1000 * 60 * 60 * 148,
    status: "pending",
    prompt: "How do you greet elders in your community when you arrive?",
    duration: "0:09",
    mode: "Prompt reader",
    language: "Nigerian English",
    device: "Redmi Note",
  },
];

export function loadContributorNotifications() {
  return [...MOCK_NOTIFICATIONS].sort((a, b) => b.timestampTs - a.timestampTs);
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
