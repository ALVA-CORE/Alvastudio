import type { ApiParticipant, ApiParticipantIn } from "@/lib/api/focusGroups";
import type { ApiLanguageVariety } from "@/lib/api/enums";
import { fromApiAgeBracket, fromApiGender, toApiAgeBracket, toApiGender } from "@/lib/api/enums";
import type {
  AgeBracket,
  Gender,
  ParticipantDraft,
  ParticipantRecord,
  SessionLanguage,
} from "@/data/interns/participants";

/**
 * What the intake form collects that `/focus-groups` cannot store.
 *
 * `ApiParticipant` has five usable fields — label, age_bracket, gender, role
 * and language_variety. The form collects four more, and they are not
 * decorative: **consent is a legal record**, and state and native language are
 * the corpus's whole sampling rationale.
 *
 * Until the backend carries them, they are kept in a local sidecar (see
 * `intern-participants.ts`) so the intern's own device does not lose them. That
 * is a stopgap, not a design — it does not survive a different browser, and a
 * consent record that lives in one laptop's localStorage is not a consent
 * record. Listed in docs/backend-gaps.md.
 */
export const UNMAPPED_PARTICIPANT_FIELDS = [
  "phone",
  "state",
  "nativeLanguage",
  "consent",
] as const;

export type ParticipantExtras = Pick<
  ParticipantRecord,
  (typeof UNMAPPED_PARTICIPANT_FIELDS)[number]
>;

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

/** The part of a draft the API will accept. */
export function draftToApiParticipant(draft: ParticipantDraft): ApiParticipantIn {
  return {
    label: draft.nameOrId,
    age_bracket: toApiAgeBracket(draft.ageBracket) ?? null,
    gender: toApiGender(draft.gender) ?? null,
    // `role` is the nearest field the API has to what someone does for a living.
    role: draft.occupation || null,
    language_variety: toApiSessionVariety(draft.sessionLanguage) ?? null,
  };
}

/** The part of a draft the API will drop, for the local sidecar. */
export function draftToExtras(draft: ParticipantDraft): ParticipantExtras {
  return {
    phone: draft.phone,
    state: draft.state,
    nativeLanguage: draft.nativeLanguage,
    consent: draft.consent,
  };
}

/** API participant + whatever the sidecar still remembers → a table row. */
export function apiToParticipantRecord(
  participant: ApiParticipant,
  context: { focusGroupSession: string },
  extras?: ParticipantExtras
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
    loggedAt: new Date(participant.created_at).getTime(),
    // Blank rather than invented when the sidecar has nothing.
    phone: extras?.phone ?? "",
    state: extras?.state ?? "",
    nativeLanguage: extras?.nativeLanguage ?? "",
    consent: extras?.consent ?? "",
  };
}
