export type InternNotificationCategory =
  | "review-queue"
  | "participant-added"
  | "session-submitted"
  | "quality-flag"
  | "payout-summary"
  | "announcement";

export type InternNotification = {
  id: string;
  category: InternNotificationCategory;
  title: string;
  subtitle: string;
  body?: string;
  timestamp: string;
  timestampTs: number;
  meta?: string[];
};

const MOCK_INTERN_NOTIFICATIONS: InternNotification[] = [
  {
    id: "i-001",
    category: "review-queue",
    title: "12 clips awaiting review",
    subtitle: "Focus group batch from Monday session",
    body: "Three clips were flagged for background noise. Prioritize Pidgin commute prompts first.",
    timestamp: "Today, 8:45 AM",
    timestampTs: Date.now() - 1000 * 60 * 60 * 3,
    meta: ["Monday session", "12 pending"],
  },
  {
    id: "i-002",
    category: "participant-added",
    title: "New participant registered",
    subtitle: "Adaeze O. joined your cohort",
    body: "Demographics and consent are complete. She is ready for the next recording slot.",
    timestamp: "Today, 7:20 AM",
    timestampTs: Date.now() - 1000 * 60 * 60 * 4,
    meta: ["Lagos", "Age 25–34"],
  },
  {
    id: "i-003",
    category: "session-submitted",
    title: "Session uploaded",
    subtitle: "Thursday focus group — 4 participants",
    body: "Audio files synced successfully. Transcripts will be available within two hours.",
    timestamp: "Yesterday, 6:10 PM",
    timestampTs: Date.now() - 1000 * 60 * 60 * 20,
    meta: ["2h 14m recorded", "4 participants"],
  },
  {
    id: "i-004",
    category: "quality-flag",
    title: "Quality threshold alert",
    subtitle: "Rejection rate above 18% this week",
    body: "Most rejections cite background noise. Consider a quieter room checklist before the next session.",
    timestamp: "Yesterday, 11:30 AM",
    timestampTs: Date.now() - 1000 * 60 * 60 * 32,
    meta: ["18.4% rejection rate", "This week"],
  },
  {
    id: "i-005",
    category: "payout-summary",
    title: "Contributor payouts processed",
    subtitle: "₦248,000 sent across your cohort",
    body: "March payouts cleared for 42 contributors. No failed transfers this cycle.",
    timestamp: "2 days ago",
    timestampTs: Date.now() - 1000 * 60 * 60 * 52,
    meta: ["42 contributors", "March 2026"],
  },
  {
    id: "i-006",
    category: "announcement",
    title: "New rubric guidelines",
    subtitle: "Updated noise and naturalness criteria",
    body: "Partial scores now require a written note. Review the doc before your next batch.",
    timestamp: "3 days ago",
    timestampTs: Date.now() - 1000 * 60 * 60 * 80,
  },
  {
    id: "i-007",
    category: "participant-added",
    title: "Participant profile updated",
    subtitle: "Chidi M. changed language preference",
    body: "Preferred recording language is now Nigerian Pidgin. Previous clips remain under English.",
    timestamp: "4 days ago",
    timestampTs: Date.now() - 1000 * 60 * 60 * 100,
    meta: ["Nigerian Pidgin"],
  },
  {
    id: "i-008",
    category: "review-queue",
    title: "Review deadline tomorrow",
    subtitle: "8 clips still pending from Saturday session",
    body: "Complete reviews before 6 PM WAT to keep the cohort on schedule for payouts.",
    timestamp: "5 days ago",
    timestampTs: Date.now() - 1000 * 60 * 60 * 120,
    meta: ["8 pending", "Due tomorrow"],
  },
];

export function loadInternNotifications() {
  return [...MOCK_INTERN_NOTIFICATIONS].sort((a, b) => b.timestampTs - a.timestampTs);
}
