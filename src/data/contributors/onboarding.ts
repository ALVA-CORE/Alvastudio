export const CONTRIBUTOR_ONBOARDING_STEPS = [
  "Identity",
  "Demographics",
  "Language",
  "Recording",
  "Consent",
] as const;

export type ContributorOnboardingStep = (typeof CONTRIBUTOR_ONBOARDING_STEPS)[number];

export const FLUENCY_LEVELS = ["none", "basic", "conversational", "fluent"] as const;
export type FluencyLevel = (typeof FLUENCY_LEVELS)[number];

export const FLUENCY_OPTIONS: { value: FluencyLevel; label: string }[] = [
  { value: "none", label: "None" },
  { value: "basic", label: "Basic" },
  { value: "conversational", label: "Conversational" },
  { value: "fluent", label: "Fluent" },
];

export const PREFERRED_VARIETY_OPTIONS = [
  { value: "english", label: "English" },
  { value: "pidgin", label: "Pidgin" },
  { value: "both", label: "Both" },
] as const;

export type PreferredVariety = (typeof PREFERRED_VARIETY_OPTIONS)[number]["value"];

export const RECORDING_DEVICE_OPTIONS = [
  { value: "mobile", label: "Mobile phone" },
  { value: "desktop-builtin", label: "Desktop / laptop (built-in mic)" },
  { value: "desktop-external", label: "Desktop + external mic" },
  { value: "tablet", label: "Tablet" },
  { value: "other", label: "Other" },
] as const;

export type RecordingDevice = (typeof RECORDING_DEVICE_OPTIONS)[number]["value"];

export function formatFluencyLabel(value: FluencyLevel | "") {
  return FLUENCY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatPreferredVarietyLabel(value: PreferredVariety | "") {
  return (
    PREFERRED_VARIETY_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

export function formatRecordingDeviceLabel(value: RecordingDevice | "") {
  return (
    RECORDING_DEVICE_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

/**
 * "How did you hear about us?", asked on the consent step.
 *
 * Each social platform is its own option rather than one "Social media"
 * bucket. Which platform is working is the question the answer exists to
 * settle. The values are stable keys for the API and the corpus chart;
 * the labels can change freely.
 */
export const REFERRAL_SOURCE_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "x", label: "X (Twitter)" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "whatsapp", label: "WhatsApp (status, group or broadcast)" },
  { value: "youtube", label: "YouTube" },
  { value: "telegram", label: "Telegram" },
  { value: "friend_colleague", label: "A friend or colleague" },
  { value: "alva_team", label: "Someone from the Alva team" },
  { value: "school_university", label: "My school or university" },
  { value: "google", label: "Google or another search engine" },
  { value: "event", label: "An event, workshop or talk" },
  { value: "news_blog", label: "News article or blog" },
  { value: "other", label: "Somewhere else" },
] as const;

export type ReferralSource = (typeof REFERRAL_SOURCE_OPTIONS)[number]["value"];

export const REFERRAL_SOURCE_VALUES = REFERRAL_SOURCE_OPTIONS.map(
  (option) => option.value
) as [ReferralSource, ...ReferralSource[]];

/** Short labels for a chart axis, where the form's longer wording would crowd. */
export const REFERRAL_SOURCE_SHORT_LABEL: Record<ReferralSource, string> = {
  instagram: "Instagram",
  x: "X",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  youtube: "YouTube",
  telegram: "Telegram",
  friend_colleague: "Friend",
  alva_team: "Alva team",
  school_university: "School",
  google: "Search",
  event: "Event",
  news_blog: "News",
  other: "Other",
};
