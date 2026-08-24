/**
 * Tag taxonomy.
 *
 * Every value here is transcribed from `alva_schema_v2.json` — the enums in
 * `languageSpan`, `disfluency`, `untranscribableSpan`, `pcmConstructionTag`,
 * `nonSpeechEvent` and `asrPayload.difficulty_flags`. Nothing is invented: a
 * value the annotator can pick that the schema rejects is a row that fails
 * validation on export, which is worse than not offering it.
 *
 * COLOUR. The design system allows one accent, and tags are the second
 * sanctioned exception after speaker colours — a hue per *family* (not per
 * value), so the eye learns four categories rather than thirty. Values within a
 * family are told apart by their label, which is what the popover is for.
 * Everything is applied at low alpha as a text wash, never a solid fill.
 */

export type SpanKind =
  | "language"
  | "disfluency"
  | "untranscribable"
  | "pcm_construction";

/** `languageSpan.span_source` — how the span got there. */
export type SpanSource = "lexicon_derived" | "annotator_added" | "annotator_removed";

export type TagOption = {
  value: string;
  label: string;
  /** Shown in the picker. Kept short — this is a tooltip, not documentation. */
  hint?: string;
};

export type TagFamily = {
  kind: SpanKind;
  label: string;
  /** One hue per family. */
  color: string;
  /** Short form for the inspector's group headers. */
  shortLabel: string;
  options: TagOption[];
};

/* ------------------------------------------------------------------ *
 * Families
 * ------------------------------------------------------------------ */

/** `$defs.language` — ISO 639-1/3, plus `und` for genuinely ambiguous tokens. */
const LANGUAGE_OPTIONS: TagOption[] = [
  { value: "pcm", label: "Nigerian Pidgin" },
  { value: "en", label: "English" },
  { value: "yo", label: "Yoruba" },
  { value: "ha", label: "Hausa" },
  { value: "ig", label: "Igbo" },
  {
    value: "und",
    label: "Undetermined",
    // Straight from the schema: a token in neither lexicon must be `und`, or
    // every out-of-vocabulary item is silently labelled English.
    hint: "In neither lexicon — never leave these unmarked",
  },
];

const DISFLUENCY_OPTIONS: TagOption[] = [
  { value: "filled_pause", label: "Filled pause", hint: "erm, ehn" },
  { value: "repetition", label: "Repetition" },
  { value: "self_correction", label: "Self-correction" },
  { value: "false_start", label: "False start" },
  { value: "prolongation", label: "Prolongation" },
];

const UNTRANSCRIBABLE_OPTIONS: TagOption[] = [
  { value: "masked_by_noise", label: "Masked by noise" },
  { value: "overlapping_speech", label: "Overlapping speech" },
  { value: "clipped_audio", label: "Clipped audio" },
  { value: "unknown_language", label: "Unknown language" },
  { value: "unknown_word", label: "Unknown word" },
  { value: "too_fast", label: "Too fast" },
  { value: "other", label: "Other" },
];

/**
 * `pcmConstructionTag` — a CLOSED taxonomy, deliberately separate from lexical
 * language spans. The schema notes these starter values await ratification by a
 * linguist, which is why the family is marked provisional in the UI.
 */
const PCM_CONSTRUCTION_OPTIONS: TagOption[] = [
  { value: "serial_verb", label: "Serial verb" },
  { value: "subjunctive_make", label: "Subjunctive (make)" },
  { value: "progressive_dey", label: "Progressive (dey)" },
  { value: "completive_don", label: "Completive (don)" },
  { value: "future_go", label: "Future (go)" },
  { value: "focus_copula_na", label: "Focus copula (na)" },
  { value: "negator_no", label: "Negator (no)" },
  { value: "ability_sabi", label: "Ability (sabi)" },
  { value: "relativizer_wey", label: "Relativizer (wey)" },
  { value: "complementizer_say", label: "Complementizer (say)" },
  { value: "reduplication", label: "Reduplication" },
  { value: "bare_plural_noun", label: "Bare plural noun" },
  { value: "other", label: "Other" },
];

/**
 * Every family the schema defines. Used for RENDERING and validation, so a
 * document that already carries a construction tag still displays and validates.
 */
export const SPAN_FAMILIES: TagFamily[] = [
  {
    kind: "language",
    label: "Language",
    shortLabel: "Language",
    color: "#53A8F2",
    options: LANGUAGE_OPTIONS,
  },
  {
    kind: "disfluency",
    label: "Disfluency",
    shortLabel: "Disfluency",
    color: "#F5A623",
    options: DISFLUENCY_OPTIONS,
  },
  {
    kind: "untranscribable",
    label: "Untranscribable",
    shortLabel: "Unclear",
    color: "#FF6B8A",
    options: UNTRANSCRIBABLE_OPTIONS,
  },
  {
    kind: "pcm_construction",
    label: "Pidgin construction",
    shortLabel: "Construction",
    color: "#B87CFF",
    options: PCM_CONSTRUCTION_OPTIONS,
  },
];

/**
 * The families actually OFFERED in the tag menu.
 *
 * Pidgin constructions are withheld: the schema itself notes that its starter
 * values "need ratification by a linguist before any annotation round uses
 * them". Shipping an unratified grammatical taxonomy would produce data nobody
 * can trust and which is expensive to re-do — so the family stays defined and
 * renderable, and returns to the menu when the linguist signs it off.
 */
export const TAG_FAMILIES: TagFamily[] = SPAN_FAMILIES.filter(
  (family) => family.kind !== "pcm_construction"
);

const FAMILY_BY_KIND = new Map(SPAN_FAMILIES.map((family) => [family.kind, family]));

export function tagFamily(kind: SpanKind): TagFamily {
  const family = FAMILY_BY_KIND.get(kind);
  if (!family) throw new Error(`Unknown tag kind: ${kind}`);
  return family;
}

export function tagColor(kind: SpanKind): string {
  return tagFamily(kind).color;
}

/** Human label for a stored value, falling back to the raw value. */
export function tagLabel(kind: SpanKind, value: string): string {
  return (
    tagFamily(kind).options.find((option) => option.value === value)?.label ?? value
  );
}

/* ------------------------------------------------------------------ *
 * Point events and clip-level flags
 * ------------------------------------------------------------------ */

/**
 * `nonSpeechEvent` — anchored to a single token, not a range. The schema is
 * explicit that the annotator supplies `at_token` only; `start_sec`/`end_sec`
 * are filled later by the forced aligner, so nothing here asks for waveform
 * scrubbing.
 */
export const NON_SPEECH_OPTIONS: TagOption[] = [
  { value: "cough", label: "Cough" },
  { value: "laugh", label: "Laugh" },
  { value: "throat_clear", label: "Throat clear" },
  { value: "breath", label: "Breath" },
  { value: "lip_smack", label: "Lip smack" },
  { value: "background_noise", label: "Background noise" },
  { value: "cross_talk", label: "Cross-talk" },
  { value: "music", label: "Music" },
  { value: "dtmf_or_beep", label: "Tone or beep" },
  { value: "non_lexical_hesitation", label: "Non-lexical hesitation" },
  { value: "other", label: "Other" },
];

export const NON_SPEECH_COLOR = "#5CE1E6";

/**
 * `asrPayload.difficulty_flags` — clip-level, and an ARRAY on purpose: the
 * schema notes heavy accent and heavy noise co-occur constantly in field
 * recordings, so this is never a single-select.
 */
export const DIFFICULTY_FLAGS: TagOption[] = [
  { value: "heavy_accent", label: "Heavy accent" },
  { value: "heavy_noise", label: "Heavy noise" },
  { value: "overlapping_speech", label: "Overlapping speech" },
  { value: "unclear_audio", label: "Unclear audio" },
  { value: "clipping", label: "Clipping" },
  { value: "low_volume", label: "Low volume" },
  { value: "fast_speech", label: "Fast speech" },
  { value: "dense_code_switching", label: "Dense code-switching" },
  { value: "domain_jargon", label: "Domain jargon" },
];

/** Every value the schema will accept, for validating imported documents. */
export function isValidTagValue(kind: SpanKind, value: string): boolean {
  return tagFamily(kind).options.some((option) => option.value === value);
}
