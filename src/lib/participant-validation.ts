import type { ParticipantDraft } from "@/data/interns/participants";

export function normalizePhoneDigits(input: string) {
  return input.replace(/\D/g, "").slice(0, 11);
}

export function isValidNigerianPhone(input: string) {
  const digits = normalizePhoneDigits(input);
  if (digits.length !== 11) return false;
  return /^0[789][01]\d{8}$/.test(digits);
}

export type ParticipantFieldErrors = Partial<Record<keyof ParticipantDraft, string>>;

export function validateParticipantDraft(draft: ParticipantDraft): ParticipantFieldErrors {
  const errors: ParticipantFieldErrors = {};

  if (!draft.nameOrId.trim()) {
    errors.nameOrId = "Name or participant ID is required.";
  }

  if (!draft.phone.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!isValidNigerianPhone(draft.phone)) {
    errors.phone = "Enter a valid 11-digit Nigerian number (e.g. 08012345678).";
  }

  if (!draft.ageBracket) {
    errors.ageBracket = "Select an age bracket.";
  }

  if (!draft.gender) {
    errors.gender = "Select a gender.";
  }

  if (!draft.state.trim()) {
    errors.state = "Select a state.";
  }

  if (!draft.nativeLanguage.trim()) {
    errors.nativeLanguage = "Native language is required.";
  }

  if (!draft.sessionLanguage) {
    errors.sessionLanguage = "Select a session language.";
  }

  if (!draft.consent) {
    errors.consent = "Confirm consent type.";
  }

  if (!draft.occupation.trim()) {
    errors.occupation = "Occupation or sector is required.";
  }

  return errors;
}
