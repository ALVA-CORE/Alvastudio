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
import type { ContributorProfileData } from "@/lib/validations/auth";

/** `ProfileOut` — `docs/api.md` §4. Every field is optional/nullable. */
export type ApiProfile = {
  age_bracket?: ApiAgeBracket | null;
  gender?: ApiGender | null;
  state_of_origin?: string | null;
  state_of_residence?: string | null;
  primary_residence_region?: string | null;
  accent_influence_region?: string | null;
  native_languages?: string[] | null;
  pidgin_fluency?: ApiPidginFluency | null;
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
 * The frontend's contributor profile is wider than the API's. These fields are
 * collected by the onboarding form and have NOWHERE to go:
 *
 *   ethnicity · occupation · englishFluency · homeLanguages · recordingDevice
 *
 * They are kept in the local user record so the profile page can still show
 * them, but they do not survive a fresh login on another device. See
 * `docs/api.md` §14.
 * ------------------------------------------------------------------ */

export function profileToApi(profile: Partial<ContributorProfileData>): ApiProfile {
  return {
    age_bracket: toApiAgeBracket(profile.ageBracket),
    gender: toApiGender(profile.gender),
    state_of_origin: profile.stateOfOrigin || undefined,
    native_languages: profile.nativeLanguages
      ? profile.nativeLanguages
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : undefined,
    pidgin_fluency: toApiFluency(profile.pidginFluency),
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
    preferredVariety: fromApiVariety(
      profile.preferred_language_variety
    ) as ContributorProfileData["preferredVariety"],
    detectedMicLabel: profile.device_mic ?? undefined,
  };
}
