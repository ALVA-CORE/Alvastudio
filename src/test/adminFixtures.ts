/**
 * Generated rows, for tests only.
 *
 * These used to live in `src/data`, where application code could import
 * them — and did. Admin screens fell back to a seeded year of users,
 * recordings and payments whenever a request failed, and the intern charts
 * drew a fixture on a live page. A figure nobody measured, shown to somebody
 * who will act on it, is worse than an empty chart.
 *
 * They are here because tests still need rows to render against. `src/test`
 * is barred from application code by an ESLint rule, so there is no way back.
 */
import {
  accountStatus,
  type AdminUser,
  type AdminUserRole,
} from "@/data/admin/users";
import type { Earning, PayoutStatus, Rate, RateUnit } from "@/data/admin/payments";
import {
  REJECTION_REASONS,
  type AdminRecording,
  type RecordingStatus,
} from "@/data/admin/oversight";
import {
  NIGERIAN_NAMES,
  STATES,
  VARIETIES,
  daysAgo,
  formatDuration,
  pick,
  relativeDays,
  round1,
  seeded,
} from "@/data/admin/shared";
import { formatNaira } from "@/data/admin/payments";
import {
  RUBRIC_QUESTIONS,
  type AdminAnnotation,
  type AdminSession,
  type AnnotationStatus,
} from "@/data/admin/oversight";
import type { BankItem, BankKind } from "@/data/admin/prompts";
import { NO_VALUE } from "@/lib/no-value";

/** One file stands in for every clip; the player is real, the source is not. */
const DEMO_CLIP = "/audio/demo-clip.wav";

const PROMPT_TEXTS = [
  "The traffic for Lagos island go always choke by seven a.m., especially when rain fall.",
  "Tell us about a market day you still remember, and what made it different.",
  "Describe the last time you helped a stranger find their way.",
  "Wetin you go tell person wey just land Naija for the first time?",
  "Talk about a meal your family makes that nobody else gets right.",
  "Explain how you get to work, from the moment you leave your door.",
  "Describe a time the light went off at the worst possible moment.",
  "Which Nigerian musician do you think will still be played in twenty years?",
  "Tell us about the busiest day you have had this month.",
  "How do you decide which bus or keke to take when you are in a hurry?",
  "Talk about something that has got cheaper, and something that has got dearer.",
  "Describe your street to someone who has never seen it.",
  "Wetin be the one advice wey your mama give you wey you still dey follow?",
  "Explain a game you played as a child, and how you won it.",
  "Tell us about a wedding you went to and what stood out.",
];

const STIMULUS_TEXTS = [
  "A photograph of a crowded Lagos danfo park at rush hour.",
  "A short clip of rain on a zinc roof.",
  "An image of jollof rice being served at a party.",
  "A photograph of a tailor's shop with fabric stacked to the ceiling.",
  "A picture of children playing football on a sandy pitch.",
  "A clip of a market trader calling out prices.",
  "A photograph of a motorcycle loaded far past sense.",
  "An image of an empty classroom at the end of term.",
  "A picture of a family sharing a meal on a Sunday.",
];


const TOPICS = [
  "Discuss one habit young people have that older people complain about.",
  "Debate whether remote work is better than going to the office.",
  "Talk about how social media changed communication in Nigeria.",
  "Discuss what makes a voice sound trustworthy.",
  "Tell us about a memorable market day.",
  "Argue for and against cash transfers as a way to reduce poverty.",
  "Describe how you would explain Lagos traffic to a visitor.",
  "Talk about a song that everyone in your family knows.",
  "Discuss whether children should learn their mother tongue first.",
  "Debate who should pay for a wedding, and why.",
  "Tell us about the last time you queued for something.",
  "Discuss what makes a neighbourhood feel safe.",
  "Argue whether football or music does more for the country.",
  "Describe a meal you would cook for someone homesick.",
];

const ANNOTATION_STATUSES: AnnotationStatus[] = [
  "approved", "approved", "approved",
  "submitted", "submitted",
  "in_progress", "in_progress",
  "draft",
  "needs_rework",
];


const ROLE_MIX: AdminUserRole[] = [
  ...Array<AdminUserRole>(11).fill("contributor"),
  ...Array<AdminUserRole>(4).fill("intern"),
  ...Array<AdminUserRole>(4).fill("annotator"),
  "admin",
];

const OUTPUT_LABEL: Record<AdminUserRole, string> = {
  contributor: "recordings",
  intern: "sessions",
  annotator: "annotations",
  admin: NO_VALUE,
};

/* Weighted: a speech corpus is mostly contributors, with a thin staff layer. */


const STATUSES: RecordingStatus[] = [
  "approved", "approved", "approved", "approved",
  "in_review", "in_review",
  "submitted", "submitted",
  "rejected",
  "flagged",
];

const MODES = ["Prompt read", "Stimuli", "Focus group"] as const;


const SAMPLE_PROMPTS = [
  "The traffic for Lagos island go always choke by seven a.m.",
  "Tell us about a market day you still remember.",
  "Describe the last time you helped a stranger find their way.",
  "Talk about a meal your family makes that nobody else gets right.",
  "Explain how you get to work, from the moment you leave your door.",
];


function buildUsers(): AdminUser[] {
  const random = seeded(7717);

  return ROLE_MIX.map((role, index) => {
    const fullName = NIGERIAN_NAMES[index % NIGERIAN_NAMES.length];
    const created = daysAgo(Math.floor(random() * 240) + 3);
    const handle = fullName.toLowerCase().replace(/\s+/g, ".");

    return {
      id: `u-${String(index + 1).padStart(3, "0")}`,
      fullName,
      email: `${handle}@alvacoreai.com`,
      phone: `080${Math.floor(random() * 90000000 + 10000000)}`,
      role,
      // A handful of leavers, so the filter has something to hide.
      isActive: role === "intern" && index % 2 === 0 ? false : random() > 0.12,
      /* Interns and annotators both apply, and some of each are still
       * waiting, so the approval queue is visible the moment the page opens
       * rather than only after somebody signs up. */
      approval: (role === "intern" || role === "annotator"
        ? index % 2 === 0
          ? "pending"
          : "approved"
        : undefined) as AdminUser["approval"],
      createdAt: created.getTime(),
      joinedLabel: relativeDays(created),
      output:
        role === "admin"
          ? 0
          : Math.floor(random() * (role === "contributor" ? 180 : 40)) + 1,
      outputLabel: OUTPUT_LABEL[role],
    };
  })
    /* Applications first. They are the only rows on this page that are
     * waiting on the person reading it; everything else is a record. */
    .sort((a, b) => {
      const waiting = Number(accountStatus(b) === "pending") -
        Number(accountStatus(a) === "pending");
      return waiting !== 0 ? waiting : b.createdAt - a.createdAt;
    });
}

export const ADMIN_USERS: AdminUser[] = buildUsers();

export function userMetrics(rows: AdminUser[]) {
  const active = rows.filter((row) => row.isActive);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return {
    total: String(rows.length),
    active: String(active.length),
    staff: String(
      active.filter((row) => row.role !== "contributor").length
    ),
    joinedThisWeek: String(rows.filter((row) => row.createdAt >= weekAgo).length),
    pending: String(
      rows.filter((row) => accountStatus(row) === "pending").length
    ),
  };
}

function buildRates(): Rate[] {
  const random = seeded(1999);
  const amounts: Record<RateUnit, number> = {
    prompt_read: 15000,
    stimuli_narration: 22500,
    focus_group_minute: 8000,
    annotation_minute: 12000,
    review: 5000,
  };

  return (Object.keys(amounts) as RateUnit[]).map((unit) => {
    const updated = daysAgo(Math.floor(random() * 90) + 5);
    return {
      unit,
      amountKobo: amounts[unit],
      updatedAt: updated.getTime(),
      updatedLabel: relativeDays(updated),
      updatedBy: "Alva Admin",
    };
  });
}

export const RATES: Rate[] = buildRates();

function buildEarnings(): Earning[] {
  const random = seeded(2024);

  return NIGERIAN_NAMES.map((contributor, index) => {
    const recordings = Math.floor(random() * 90) + 4;
    const minutes = round1(recordings * (0.4 + random() * 1.2));
    const earnedKobo = Math.round(recordings * 15000 + minutes * 800);
    const roll = random();
    const status: PayoutStatus =
      roll > 0.62 ? "paid" : roll > 0.38 ? "processing" : "pending";
    const activity = daysAgo(Math.floor(random() * 21));

    return {
      id: `e-${String(index + 1).padStart(3, "0")}`,
      contributor,
      recordings,
      minutes,
      earnedKobo,
      // Only a settled payout has money against it.
      paidKobo: status === "paid" ? earnedKobo : 0,
      status,
      lastActivityAt: activity.getTime(),
      lastActivityLabel: relativeDays(activity),
    };
  }).sort((a, b) => b.earnedKobo - a.earnedKobo);
}

export const EARNINGS: Earning[] = buildEarnings();

export function paymentMetrics(rows: Earning[]) {
  const owed = rows
    .filter((row) => row.status !== "paid")
    .reduce((sum, row) => sum + row.earnedKobo, 0);

  return {
    owed: formatNaira(owed),
    paid: formatNaira(rows.reduce((sum, row) => sum + row.paidKobo, 0)),
    contributors: String(rows.length),
    pending: String(rows.filter((row) => row.status === "pending").length),
  };
}

function buildRecordings(count: number): AdminRecording[] {
  const random = seeded(31337);

  return Array.from({ length: count }, (_, index) => {
    const status = pick(random, STATUSES);
    const submitted = daysAgo(Math.floor(random() * 45));
    const durationSec = Math.floor(random() * 95) + 12;

    return {
      id: `r-${String(index + 1).padStart(3, "0")}`,
      code: `REC-${String(index + 1).padStart(4, "0")}`,
      contributor: pick(random, NIGERIAN_NAMES),
      mode: pick(random, MODES),
      prompt: pick(random, SAMPLE_PROMPTS),
      durationSec,
      duration: formatDuration(durationSec),
      variety: pick(random, VARIETIES),
      status,
      reviewer:
        status === "submitted" ? "" : pick(random, NIGERIAN_NAMES.slice(0, 6)),
      audioUrl: DEMO_CLIP,
      submittedAt: submitted.getTime(),
      reviewedAt: 0,
      submittedLabel: relativeDays(submitted),
      rejectionReason:
        status === "rejected" || status === "flagged"
          ? pick(random, REJECTION_REASONS)
          : undefined,
      /* Demo mode only, and only where a verdict exists. An undecided clip
         has nobody's answers on it here either. */
      rubric:
        status === "submitted" || status === "in_review"
          ? null
          : RUBRIC_QUESTIONS.map((question) => ({
              ...question,
              answer:
                status === "approved"
                  ? ("yes" as const)
                  : pick(random, ["yes", "partial", "no"] as const),
            })),
      reviewNotes: null,
    };
  }).sort((a, b) => b.submittedAt - a.submittedAt);
}

export const ADMIN_RECORDINGS: AdminRecording[] = buildRecordings(64);

function buildAnnotations(count: number): AdminAnnotation[] {
  const random = seeded(8086);

  return Array.from({ length: count }, (_, index) => {
    const claimed = daysAgo(Math.floor(random() * 30));
    const durationSec = Math.floor(random() * 2100) + 600;
    const segments = Math.floor(random() * 220) + 40;

    return {
      id: `a-${String(index + 1).padStart(3, "0")}`,
      code: `ANN-${String(index + 1).padStart(4, "0")}`,
      topic: pick(random, TOPICS),
      annotator: pick(random, NIGERIAN_NAMES.slice(0, 8)),
      status: pick(random, ANNOTATION_STATUSES),
      segments,
      tags: Math.floor(segments * (0.3 + random() * 0.8)),
      durationSec,
      duration: formatDuration(durationSec),
      claimedAt: claimed.getTime(),
      updatedAt: 0,
      claimedLabel: relativeDays(claimed),
    };
  }).sort((a, b) => b.claimedAt - a.claimedAt);
}

export const ADMIN_ANNOTATIONS: AdminAnnotation[] = buildAnnotations(38);

function buildSessions(count: number): AdminSession[] {
  const random = seeded(6502);

  return Array.from({ length: count }, (_, index) => {
    const created = daysAgo(Math.floor(random() * 60));
    // A quarter never got their audio uploaded — invisible work, and the
    // single most useful thing this page surfaces.
    const hasAudio = random() > 0.25;
    const durationSec = hasAudio ? Math.floor(random() * 2400) + 900 : 0;
    const participants = Math.floor(random() * 5) + 2;

    return {
      id: `fg-${String(index + 1).padStart(3, "0")}`,
      code: `FG-${String(index + 1).padStart(4, "0")}`,
      topic: pick(random, TOPICS),
      intern: pick(random, NIGERIAN_NAMES.slice(8, 14)),
      state: pick(random, STATES),
      variety: pick(random, VARIETIES),
      participants,
      turns: hasAudio ? Math.floor(random() * 90) + participants * 4 : 0,
      durationSec,
      duration: hasAudio ? formatDuration(durationSec) : NO_VALUE,
      hasAudio,
      redactedCount: 0,
      // Roughly one uploaded session in six is still sitting in the queue.
      claimedBy:
        hasAudio && random() > 0.17
          ? pick(random, NIGERIAN_NAMES.slice(0, 8))
          : null,
      createdAt: created.getTime(),
      createdLabel: relativeDays(created),
    };
  }).sort((a, b) => b.createdAt - a.createdAt);
}

export const ADMIN_SESSIONS: AdminSession[] = buildSessions(42);

function buildBank(): BankItem[] {
  const random = seeded(4242);

  const make = (text: string, kind: BankKind, index: number): BankItem => {
    const created = daysAgo(Math.floor(random() * 180) + 1);
    return {
      id: `${kind === "prompt" ? "p" : "s"}-${String(index + 1).padStart(3, "0")}`,
      kind,
      text,
      variety: pick(random, VARIETIES),
      category: kind === "prompt" ? "prompt" : "stimulus",
      // A few retired items, so the active filter is worth having.
      isActive: random() > 0.15,
      // Roughly a fifth have never been recorded — the thing to spot.
      usedByCount: random() > 0.2 ? Math.floor(random() * 48) : 0,
      createdAt: created.getTime(),
      createdLabel: relativeDays(created),
    };
  };

  return [
    ...PROMPT_TEXTS.map((text, index) => make(text, "prompt", index)),
    ...STIMULUS_TEXTS.map((text, index) => make(text, "stimulus", index)),
  ].sort((a, b) => b.createdAt - a.createdAt);
}

export const BANK_ITEMS: BankItem[] = buildBank();

export function bankMetrics(rows: BankItem[]) {
  const active = rows.filter((row) => row.isActive);
  return {
    total: String(rows.length),
    active: String(active.length),
    unused: String(active.filter((row) => row.usedByCount === 0).length),
    recordings: String(
      rows.reduce((sum, row) => sum + row.usedByCount, 0).toLocaleString()
    ),
  };
}
