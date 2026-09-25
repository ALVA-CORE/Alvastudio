import type { FluencyLevel, PreferredVariety } from "@/data/contributors/onboarding";

/**
 * The backend's vocabularies, transcribed from `docs/api.md`, plus the
 * translation to and from the frontend's own.
 *
 * The two were designed independently, so several values do not line up. Every
 * mismatch is handled in one direction here rather than being patched at call
 * sites — a mapping that lives in six places drifts in five of them.
 *
 * UNVERIFIED: the published spec names `AgeBracket`, `Gender` and
 * `PidginFluency` but does not enumerate their members. The values below are
 * inferred from the spec's examples (`25_34`, `under_18`, `male`, `female`,
 * `conversational`). Confirm against `/openapi.json` before trusting them.
 */

/* ------------------------------------------------------------------ *
 * API vocabularies
 * ------------------------------------------------------------------ */

/** NOTE: the API has no `annotator`. See `docs/api.md` §14. */
export type ApiUserRole = "contributor" | "intern" | "admin";

export type ApiLanguageVariety = "nigerian_english" | "nigerian_pidgin";

export type ApiAgeBracket =
  | "under_18"
  | "18_24"
  | "25_34"
  | "35_44"
  | "45_54"
  | "55_64"
  | "65_plus";

export type ApiGender = "male" | "female" | "other" | "prefer_not_to_say";

export type ApiPidginFluency = "none" | "basic" | "conversational" | "fluent" | "native";

export type ApiConsentType = "ndpa_data_use";

export type ApiSessionType = "prompt_read" | "stimuli_narration";

export type ApiRecordingStatus =
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "flagged";

export type ApiQualityAnswer = "yes" | "partial" | "no";

export type ApiVerdict = "approve" | "reject" | "flag";

/* ------------------------------------------------------------------ *
 * Age bracket — same buckets, different separator
 * ------------------------------------------------------------------ */

const AGE_BRACKET_TO_API: Record<string, ApiAgeBracket> = {
  "18-24": "18_24",
  "25-34": "25_34",
  "35-44": "35_44",
  "45-54": "45_54",
  "55+": "55_64",
};

const AGE_BRACKET_FROM_API: Record<string, string> = {
  under_18: "18-24",
  "18_24": "18-24",
  "25_34": "25-34",
  "35_44": "35-44",
  "45_54": "45-54",
  "55_64": "55+",
  "65_plus": "55+",
};

export function toApiAgeBracket(value: string | undefined): ApiAgeBracket | undefined {
  return value ? AGE_BRACKET_TO_API[value] : undefined;
}

export function fromApiAgeBracket(value: string | null | undefined): string {
  return value ? (AGE_BRACKET_FROM_API[value] ?? value) : "";
}

/* ------------------------------------------------------------------ *
 * Gender — the frontend hyphenates where the API underscores
 * ------------------------------------------------------------------ */

export function toApiGender(value: string | undefined): ApiGender | undefined {
  if (!value) return undefined;
  if (value === "prefer-not-to-say") return "prefer_not_to_say";
  return value as ApiGender;
}

export function fromApiGender(value: string | null | undefined): string {
  if (!value) return "";
  if (value === "prefer_not_to_say") return "prefer-not-to-say";
  return value;
}

/* ------------------------------------------------------------------ *
 * Fluency — the shared members match; `native` is API-only
 * ------------------------------------------------------------------ */

export function toApiFluency(value: FluencyLevel | undefined): ApiPidginFluency | undefined {
  return value || undefined;
}

export function fromApiFluency(value: string | null | undefined): FluencyLevel | "" {
  if (!value) return "";
  // `native` has no frontend equivalent; it is the strongest option we do have.
  if (value === "native") return "fluent";
  return value as FluencyLevel;
}

/* ------------------------------------------------------------------ *
 * Language variety
 *
 * The one genuinely lossy mapping. The frontend offers English / Pidgin /
 * **Both**; the API is a two-member enum with no "both". A contributor who
 * speaks both is sent as `nigerian_pidgin` — the narrower, more informative
 * claim, since every Pidgin speaker in this corpus also has English — and the
 * choice is NOT round-tripped, so reloading shows "Pidgin" rather than "Both".
 *
 * This needs a backend fix, not a cleverer mapping. See `docs/api.md` §14.
 * ------------------------------------------------------------------ */

export function toApiVariety(
  value: PreferredVariety | undefined
): ApiLanguageVariety | undefined {
  if (!value) return undefined;
  if (value === "english") return "nigerian_english";
  return "nigerian_pidgin";
}

export function fromApiVariety(value: string | null | undefined): PreferredVariety | "" {
  if (value === "nigerian_english") return "english";
  if (value === "nigerian_pidgin") return "pidgin";
  return "";
}
