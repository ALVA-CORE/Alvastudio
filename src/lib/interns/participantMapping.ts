import type { ApiParticipant, ApiParticipantIn } from "@/lib/api/focusGroups";
import type { ApiLanguageVariety } from "@/lib/api/enums";
import { fromApiAgeBracket, fromApiGender, toApiAgeBracket, toApiGender } from "@/lib/api/enums";
import type {
  AgeBracket,
  ConsentType,
  Gender,
  ParticipantDraft,
  ParticipantRecord,
  SessionLanguage,
} from "@/data/interns/participants";

/**
 * Session language → API variety.
 *
 * Lossy in the same way `toApiVariety` is, and for the same reason: the API's
 * enum has two members and the form has three. "Mixed" is sent as Pidgin — the
 * narrower, more informative claim — and does not round-trip.
 */
export function toApiSessionVariety(
  value: SessionLanguage | ""
): ApiLanguageVariety | undefined {
  if (!value) return undefined;
  return value === "english" ? "nigerian_english" : "nigerian_pidgin";
}

export function fromApiSessionVariety(
  value: ApiLanguageVariety | null
): SessionLanguage | "" {
  if (value === "nigerian_english") return "english";
  if (value === "nigerian_pidgin") return "pidgin";
  return "";
}

/**
 * How consent is carried.
 *
 * The API models consent as a boolean plus a free-text version string; the
 * intake form asks *how* it was given, verbal or signed. Both mean consent was
 * obtained, so `consent_given` is the boolean and the method rides in
 * `consent_version`. That field is meant for a document version, so this is a
 * near-miss rather than a fit — noted in docs/backend-gaps.md as a small ask
 * for a proper `consent_method`.
 */
const CONSENT_METHODS = new Set<string>(["verbal", "signed"]);

function fromConsentVersion(value: string | null): ConsentType | "" {
  return value && CONSENT_METHODS.has(value) ? (value as ConsentType) : "";
}

/** A draft, in the shape the API accepts. Every field now has a home. */
export function draftToApiParticipant(draft: ParticipantDraft): ApiParticipantIn {
  return {
    label: draft.nameOrId,
    age_bracket: toApiAgeBracket(draft.ageBracket) ?? null,
    gender: toApiGender(draft.gender) ?? null,
    // `role` is the nearest field the API has to what someone does for a living.
    role: draft.occupation || null,
    language_variety: toApiSessionVariety(draft.sessionLanguage) ?? null,
    state: draft.state || null,
    native_language: draft.nativeLanguage || null,
    phone: draft.phone || null,
    // The form does not offer "no" — an unconsented participant is not logged.
    consent_given: Boolean(draft.consent),
    consent_version: draft.consent || undefined,
  };
}

/** An API participant → a table row. */
export function apiToParticipantRecord(
  participant: ApiParticipant,
  context: { focusGroupSession: string }
): ParticipantRecord {
  return {
    id: participant.id,
    sessionId: participant.session_id,
    focusGroupSession: context.focusGroupSession,
    nameOrId: participant.label,
    ageBracket: fromApiAgeBracket(participant.age_bracket) as AgeBracket | "",
    gender: fromApiGender(participant.gender) as Gender | "",
    sessionLanguage: fromApiSessionVariety(participant.language_variety),
    occupation: participant.role ?? "",
    state: participant.state ?? "",
    nativeLanguage: participant.native_language ?? "",
    phone: participant.phone ?? "",
    consent: fromConsentVersion(participant.consent_version),
    loggedAt: new Date(participant.created_at).getTime(),
  };
}
