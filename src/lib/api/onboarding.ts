import { apiFetch } from "./client";
import type {
  ApiAgeBracket,
  ApiConsentType,
  ApiGender,
  ApiLanguageVariety,
  ApiPidginFluency,
} from "./enums";
import {
  fromApiAgeBracket,
  fromApiFluency,
  fromApiGender,
  fromApiVariety,
  toApiAgeBracket,
  toApiFluency,
  toApiGender,
  toApiVariety,
} from "./enums";
import type {
  ContributorProfileData,
  InternProfileData,
} from "@/lib/validations/auth";

/** `ProfileOut` — `docs/backend/api.md` §4. Every field is optional/nullable. */
export type ApiProfile = {
  age_bracket?: ApiAgeBracket | null;
  gender?: ApiGender | null;
  state_of_origin?: string | null;
  state_of_residence?: string | null;
  primary_residence_region?: string | null;
  accent_influence_region?: string | null;
  native_languages?: string[] | null;
  pidgin_fluency?: ApiPidginFluency | null;
  ethnicity?: string | null;
  occupation?: string | null;
  /** What is spoken at home now, against `native_languages` for growing up. */
  home_languages?: string[] | null;
  /** Same enum as `pidgin_fluency`: one scale, asked twice. */
  english_fluency?: ApiPidginFluency | null;
  preferred_language_variety?: ApiLanguageVariety | null;
  device_mic?: string | null;
};

export type ApiConsent = {
  id: string;
  user_id: string;
  consent_type: ApiConsentType;
  accepted: boolean;
  policy_version: string;
  notes: string | null;
  accepted_at: string;
};

export function getProfile(): Promise<ApiProfile> {
  return apiFetch<ApiProfile>("/onboarding/profile");
}

/**
 * `PUT /onboarding/profile` — a MERGE, not a replace.
 *
 * Only the fields present in the body are applied, which is what lets the
 * multi-step onboarding form submit each step as it completes rather than
 * holding everything until the end.
 */
export function upsertProfile(patch: ApiProfile): Promise<ApiProfile> {
  return apiFetch<ApiProfile>("/onboarding/profile", { method: "PUT", body: patch });
}

/**
 * `AnnotatorProfileOut` — what an annotator is cleared for.
 *
 * Both fields are nullable: a profile that has never been set comes back with
 * nothing in it, which is different from being cleared for nothing.
 */
export type ApiAnnotatorProfile = {
  language_varieties?: ApiLanguageVariety[] | null;
  sessions_covered?: string[] | null;
};

export function getAnnotatorProfile(): Promise<ApiAnnotatorProfile> {
  return apiFetch<ApiAnnotatorProfile>("/onboarding/annotator-profile");
}

/** A merge, like the contributor profile: only the fields sent are applied. */
export function upsertAnnotatorProfile(
  patch: ApiAnnotatorProfile
): Promise<ApiAnnotatorProfile> {
  return apiFetch<ApiAnnotatorProfile>("/onboarding/annotator-profile", {
    method: "PUT",
    body: patch,
  });
}

/**
 * What an intern covers, and how often they want chasing.
 *
 * `GET/PUT /onboarding/intern-profile` existed from the start and was never
 * called. The sign-up form asked for all three and then kept them in
 * `localStorage` — so an intern's state and coverage lived in one browser,
 * vanished on another device, and an admin opening their panel saw nothing
 * under "What they told us" for a field the intern had definitely filled in.
 *
 * `alert_settings` is a free-form object on the API. We keep the three flags
 * the sign-up form collects and nothing else, so a future setting can be
 * added without a migration.
 */
export type ApiInternProfile = {
  primary_state?: string | null;
  coverage_areas?: string[] | null;
  alert_settings?: Record<string, unknown> | null;
};

export function getInternProfile(): Promise<ApiInternProfile> {
  return apiFetch<ApiInternProfile>("/onboarding/intern-profile");
}

/** A merge, like the other two: only the fields sent are applied. */
export function upsertInternProfile(
  patch: ApiInternProfile
): Promise<ApiInternProfile> {
  return apiFetch<ApiInternProfile>("/onboarding/intern-profile", {
    method: "PUT",
    body: patch,
  });
}

/**
 * `coverage` is one free-text line on the form and a list on the API.
 *
 * Split on commas, which is how people type more than one in a single box.
 * A single area survives the round trip unchanged.
 */
export function internProfileToApi(
  profile: Partial<InternProfileData>
): ApiInternProfile {
  return {
    primary_state: profile.primaryState || null,
    coverage_areas: profile.coverage
      ? profile.coverage.split(",").map((area) => area.trim()).filter(Boolean)
      : null,
    alert_settings: {
      quota_alerts: profile.quotaAlerts ?? "weekly",
      session_reminders: profile.sessionReminders ?? true,
      review_updates: profile.reviewUpdates ?? true,
    },
  };
}

export function internProfileFromApi(
  profile: ApiInternProfile
): Partial<InternProfileData> {
  const alerts = (profile.alert_settings ?? {}) as Record<string, unknown>;
  const quota = alerts.quota_alerts;

  return {
    primaryState: profile.primary_state ?? "",
    coverage: (profile.coverage_areas ?? []).join(", "),
    quotaAlerts:
      quota === "daily" || quota === "off" || quota === "weekly" ? quota : "weekly",
    sessionReminders: alerts.session_reminders !== false,
    reviewUpdates: alerts.review_updates !== false,
  };
}

export function listConsents(): Promise<ApiConsent[]> {
  return apiFetch<ApiConsent[]>("/onboarding/consent");
}

/** Append-only: there is no update or delete. A change of mind is a new record. */
export function recordConsent(payload: {
  accepted: boolean;
  consent_type?: ApiConsentType;
  policy_version?: string;
  notes?: string | null;
}): Promise<ApiConsent> {
  return apiFetch<ApiConsent>("/onboarding/consent", { method: "POST", body: payload });
}

/* ------------------------------------------------------------------ *
 * Translation
 *
 * Every answer the onboarding form collects now has somewhere to go.
 *
 * `native_languages` and `home_languages` are two questions: what somebody
 * grew up speaking, and what is spoken at home now. `recordingDevice` rides
 * in `device_mic`, behind the detected label when we have one, which is
 * richer than the enum the form offers.
 * ------------------------------------------------------------------ */

/** Comma-separated on screen, a list at the API. */
function toList(value: string | undefined) {
  if (!value) return undefined;
  const entries = value.split(",").map((entry) => entry.trim()).filter(Boolean);
  return entries.length ? entries : undefined;
}

export function profileToApi(profile: Partial<ContributorProfileData>): ApiProfile {
  return {
    age_bracket: toApiAgeBracket(profile.ageBracket),
    gender: toApiGender(profile.gender),
    state_of_origin: profile.stateOfOrigin || undefined,
    native_languages: toList(profile.nativeLanguages),
    home_languages: toList(profile.homeLanguages),
    pidgin_fluency: toApiFluency(profile.pidginFluency),
    english_fluency: toApiFluency(profile.englishFluency),
    ethnicity: profile.ethnicity || undefined,
    occupation: profile.occupation || undefined,
    preferred_language_variety: toApiVariety(profile.preferredVariety),
    // The API models the mic as free text, so the detected label is richer than
    // the enum the form collects — send it when we have it.
    device_mic: profile.detectedMicLabel || profile.recordingDevice || undefined,
  };
}

export function profileFromApi(profile: ApiProfile): Partial<ContributorProfileData> {
  return {
    ageBracket: fromApiAgeBracket(profile.age_bracket),
    gender: fromApiGender(profile.gender) as ContributorProfileData["gender"],
    stateOfOrigin: profile.state_of_origin ?? "",
    nativeLanguages: (profile.native_languages ?? []).join(", "),
    pidginFluency: fromApiFluency(profile.pidgin_fluency) as ContributorProfileData["pidginFluency"],
    englishFluency: fromApiFluency(profile.english_fluency) as ContributorProfileData["englishFluency"],
    ethnicity: profile.ethnicity ?? undefined,
    occupation: profile.occupation ?? undefined,
    homeLanguages: (profile.home_languages ?? []).join(", "),
    preferredVariety: fromApiVariety(
      profile.preferred_language_variety
    ) as ContributorProfileData["preferredVariety"],
    detectedMicLabel: profile.device_mic ?? undefined,
  };
}
