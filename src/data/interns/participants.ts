export type AgeBracket = "18-24" | "25-34" | "35-44" | "45-54" | "55+";

export type SessionLanguage = "english" | "pidgin" | "mixed";

export type ConsentType = "verbal" | "signed";

export type Gender = "male" | "female" | "prefer-not-to-say";

export type ParticipantRecord = {
  id: string;
  sessionId: string;
  focusGroupSession: string;
  nameOrId: string;
  phone: string;
  ageBracket: AgeBracket | "";
  gender: Gender | "";
  state: string;
  nativeLanguage: string;
  sessionLanguage: SessionLanguage | "";
  consent: ConsentType | "";
  occupation: string;
  loggedAt: number;
};

export type ParticipantDraft = Omit<ParticipantRecord, "id" | "loggedAt" | "sessionId" | "focusGroupSession">;

export const EMPTY_PARTICIPANT_DRAFT: ParticipantDraft = {
  nameOrId: "",
  phone: "",
  ageBracket: "",
  gender: "",
  state: "",
  nativeLanguage: "",
  sessionLanguage: "",
  consent: "",
  occupation: "",
};

export const AGE_BRACKET_OPTIONS: { value: AgeBracket; label: string }[] = [
  { value: "18-24", label: "18–24" },
  { value: "25-34", label: "25–34" },
  { value: "35-44", label: "35–44" },
  { value: "45-54", label: "45–54" },
  { value: "55+", label: "55+" },
];

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

export const SESSION_LANGUAGE_OPTIONS: { value: SessionLanguage; label: string }[] = [
  { value: "english", label: "English" },
  { value: "pidgin", label: "Pidgin" },
  { value: "mixed", label: "Mixed" },
];

export const CONSENT_OPTIONS: { value: ConsentType; label: string }[] = [
  { value: "verbal", label: "Verbal consent" },
  { value: "signed", label: "Signed consent" },
];

export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;

export const PARTICIPANT_COUNT_OPTIONS = [1, 2, 3] as const;

export const PARTICIPANT_METRICS = {
  total: "214",
  totalTrend: "+18%",
  thisWeek: "42",
  thisWeekTrend: "+6",
  sessions: "38",
  sessionsTrend: "+4",
  quotaFill: "78%",
  quotaTrend: "+5%",
  periodLabel: "Last 30 days",
};

export const EMPTY_PARTICIPANT_METRICS: typeof PARTICIPANT_METRICS = {
  total: "0",
  totalTrend: "0%",
  thisWeek: "0",
  thisWeekTrend: "0",
  sessions: "0",
  sessionsTrend: "0",
  quotaFill: "0%",
  quotaTrend: "0%",
  periodLabel: PARTICIPANT_METRICS.periodLabel,
};

export function formatGenderLabel(value: Gender | "") {
  return GENDER_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatConsentLabel(value: ConsentType | "") {
  return CONSENT_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatSessionLanguageLabel(value: SessionLanguage | "") {
  return SESSION_LANGUAGE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
