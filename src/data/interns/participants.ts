export type AgeBracket = "18-24" | "25-34" | "35-44" | "45-54" | "55+";

export type SessionLanguage = "english" | "pidgin" | "mixed";

export type ConsentType = "verbal" | "signed";

export type ParticipantRecord = {
  id: string;
  nameOrId: string;
  phone: string;
  ageBracket: AgeBracket | "";
  gender: string;
  state: string;
  nativeLanguage: string;
  sessionLanguage: SessionLanguage | "";
  consent: ConsentType | "";
  occupation: string;
  loggedAt: number;
};

export type ParticipantDraft = Omit<ParticipantRecord, "id" | "loggedAt">;

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

export const SESSION_LANGUAGE_OPTIONS: { value: SessionLanguage; label: string }[] = [
  { value: "english", label: "English" },
  { value: "pidgin", label: "Pidgin" },
  { value: "mixed", label: "Mixed" },
];

export const CONSENT_OPTIONS: { value: ConsentType; label: string }[] = [
  { value: "verbal", label: "Verbal consent" },
  { value: "signed", label: "Signed consent" },
];

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
