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
