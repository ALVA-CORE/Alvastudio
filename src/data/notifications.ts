import { formatWalletNaira } from "@/data/contributors/wallet";
import type { ApiNotification } from "@/lib/api/notifications";
import type { ApiRecording } from "@/lib/api/recordings";
import type {
  ContributorNotification,
  NotificationAction,
  NotificationCategory,
  NotificationStatus,
} from "@/data/contributor-notifications";
import type { InternNotification, InternNotificationCategory } from "@/data/intern-notifications";
import { formatDuration } from "@/lib/duration";

/**
 * Maps the API's notifications onto the two shapes the screens already speak.
 *
 * `kind` is an enum (see `ApiNotificationKind`), so the known values are
 * matched directly. The substring fallback stays for anything added later: a
 * notification with a kind we have never seen should still be readable, and
 * losing it because its icon is unknown would be the worse failure.
 *
 * `key` becomes the id. It is opaque, unique, and the value that has to go
 * back to `POST /notifications/read`, so carrying anything else would mean
 * holding two identifiers for one row.
 */

function has(kind: string, ...needles: string[]) {
  const lower = kind.toLowerCase();
  return needles.some((needle) => lower.includes(needle));
}

function contributorCategory(kind: string): NotificationCategory {
  if (kind === "announcement") return "announcement";
  if (kind === "queue") return "new-work";
  if (kind === "earning") return "payout";
  /* `identity` arrived with the 27 Oct document-review change. It carries no
     id to link to, so the row opens the wallet, which is where the thing it
     is asking for happens. */
  if (kind === "identity") return "identity";
  if (has(kind, "approved", "accepted")) return "review-accepted";
  if (has(kind, "rejected", "rework", "not_approved")) return "review-rejected";
  if (has(kind, "recording", "submission", "submitted")) return "submission-received";
  if (has(kind, "payout", "payment", "wallet", "earning")) return "payout";
  if (has(kind, "points", "rank", "leaderboard")) return "leaderboard";
  return "announcement";
}

/**
 * A verdict is kind `review`, told apart only by its title, which the API
 * fixes per verdict. Its text is that sentence, then the reviewer's notes.
 */
const VERDICT: Record<string, { category: NotificationCategory; status: NotificationStatus; sentence: string }> = {
  "Recording approved": {
    category: "review-accepted",
    status: "accepted",
    sentence: "Your recording was approved.",
  },
  "Recording rejected": {
    category: "review-rejected",
    status: "rejected",
    sentence: "Your recording was rejected.",
  },
  "Recording flagged": {
    category: "submission-received",
    status: "pending",
    sentence: "Your recording was flagged for another look.",
  },
};

/* "NGN 10.00 for an approved sentence.": the API writes the amount first. */
function earned(body: string) {
  const match = /^NGN ([\d,]+(?:\.\d+)?)\b/.exec(body);
  return match ? formatWalletNaira(Math.round(Number(match[1].replace(/,/g, "")) * 100)) : undefined;
}

function contributorStatus(kind: string): NotificationStatus | undefined {
  if (has(kind, "approved", "accepted")) return "accepted";
  if (has(kind, "rejected", "rework", "not_approved")) return "rejected";
  if (has(kind, "submitted", "submission")) return "pending";
  return undefined;
}

function staffCategory(kind: string): InternNotificationCategory {
  /* Admins only: somebody has applied and is waiting. It is an announcement
   * rather than a queue item because the queue categories are about work, and
   * this is about a person. */
  if (kind === "approval") return "announcement";
  if (kind === "announcement") return "announcement";
  if (kind === "queue") return "review-queue";
  if (kind === "earning") return "payout-summary";
  if (kind === "annotation") return "session-submitted";
  if (has(kind, "review", "queue")) return "review-queue";
  if (has(kind, "participant")) return "participant-added";
  if (has(kind, "session", "annotation", "recording")) return "session-submitted";
  if (has(kind, "flag", "quality", "rework")) return "quality-flag";
  if (has(kind, "payout", "payment", "earning")) return "payout-summary";
  return "announcement";
}

/**
 * The button, when both halves are there and the link is one the bell can
 * follow: a studio path (never `//`, which a browser reads as another site)
 * or https.
 */
function actionOf(api: ApiNotification): NotificationAction | undefined {
  const label = api.action_label;
  const url = api.action_url;
  if (!label || !url) return undefined;
  const inStudio = url.startsWith("/") && !url.startsWith("//");
  if (inStudio) return { label, url };
  /* A full link to this studio is followed inside it. Opened as a new
     window it lands without the sign-in: an installed app's links open in
     the browser, which shares none of its storage. */
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return undefined;
  }
  if (target.origin === window.location.origin) {
    return { label, url: `${target.pathname}${target.search}${target.hash}` };
  }
  return target.protocol === "https:" ? { label, url } : undefined;
}

/**
 * A contributor's two `queue` items carry no id, so the key's prefix is the
 * one way to tell sentences from topics.
 */
function studioModeOf(api: ApiNotification): ContributorNotification["studioMode"] {
  if (api.kind !== "queue") return undefined;
  if (api.key.startsWith("prompts:")) return "prompt";
  if (api.key.startsWith("stimuli:")) return "stimuli";
  return undefined;
}

/** "Today, 8:45 AM" for anything from today, "12 Oct, 8:45 AM" before that. */
function formatNotificationTime(iso: string) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const today = new Date();
  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (sameDay) return `Today, ${time}`;

  const day = date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
  return `${day}, ${time}`;
}

export function toContributorNotification(
  api: ApiNotification
): ContributorNotification {
  const verdict = api.kind === "review" ? VERDICT[api.title] : undefined;
  const amount = api.kind === "earning" ? earned(api.body) : undefined;
  return {
    id: api.key,
    category: verdict?.category ?? contributorCategory(api.kind),
    title: api.title,
    subtitle: api.body,
    timestamp: formatNotificationTime(api.created_at),
    timestampTs: new Date(api.created_at).getTime(),
    status: verdict?.status ?? contributorStatus(api.kind),
    read: api.read ?? false,
    /* The sheet's text. A verdict's own sentence repeats its title, so only
       the reviewer's notes are kept; a payment's amount is its own row. */
    body: verdict
      ? api.body.replace(verdict.sentence, "").trim() || undefined
      : amount
        ? undefined
        : api.body,
    amount,
    action: actionOf(api),
    studioMode: studioModeOf(api),
  };
}

/**
 * Where a staff `queue` item opens. Narrations waiting for annotators and
 * flagged recordings carry a `recording_id` as an intern's clips do, so the
 * key's prefix comes first.
 */
function queueLink(api: ApiNotification) {
  if (api.kind !== "queue") return undefined;
  if (api.key.startsWith("narrations:")) return "/annotator/narrations";
  /* A contributor reported by three flags (ask #25). */
  if (api.key.startsWith("recording-flags:")) return "/admin/users?tab=flagged";
  return api.recording_id ? "/intern/review" : undefined;
}

export function toStaffNotification(api: ApiNotification): InternNotification {
  return {
    id: api.key,
    category: staffCategory(api.kind),
    title: api.title,
    subtitle: api.body,
    timestamp: formatNotificationTime(api.created_at),
    timestampTs: new Date(api.created_at).getTime(),
    read: api.read ?? false,
    action: actionOf(api),
    link: queueLink(api),
  };
}

const MODE_LABEL: Record<string, string> = {
  prompt_read: "Prompt read",
  stimuli: "Stimuli",
  stimulus: "Stimuli",
  focus_group: "Focus group",
};

function formatRecordingLength(seconds: number | null) {
  return seconds ? formatDuration(seconds) : undefined;
}

/**
 * Folds a recording into the notification that pointed at it.
 *
 * The notification itself carries a title, a body and a timestamp, and that is
 * all. "Your clip was rejected" without the prompt it was read from is a
 * verdict with no subject, so the detail sheet fetches the recording the
 * notification names and fills in what it got. Everything here is optional on
 * the sheet, so a fetch that fails leaves the notification readable rather
 * than broken.
 */
export function withRecordingDetail(
  notification: ContributorNotification,
  recording: ApiRecording
): ContributorNotification {
  return {
    ...notification,
    prompt: recording.prompt_text ?? recording.stimulus_text ?? notification.prompt,
    duration:
      formatRecordingLength(recording.measured_duration_seconds ?? recording.duration_seconds) ??
      notification.duration,
    mode: MODE_LABEL[recording.session_type] ?? recording.session_type,
    device: recording.device_mic ?? notification.device,
  };
}
