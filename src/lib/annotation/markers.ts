import { NON_SPEECH_OPTIONS } from "./tags";

/**
 * Bracket markers: non-speech tags written between words as `[laugh]`.
 *
 * In the store a mark is a type at a word (`at_token`); the text never holds
 * one. Markers are how they are typed and how edit mode shows them, so text
 * goes in and out of this module, and nothing else parses brackets.
 */

/* Each API type's bracket word. The lead's other markers wait on ask #29. */
const WORDS: Record<string, string> = {
  throat_clear: "throat-clear",
  lip_smack: "lip-smack",
  non_lexical_hesitation: "hesitation",
  background_noise: "noise",
  cross_talk: "cross-talk",
  dtmf_or_beep: "beep",
};

/** Every sound tag the API takes, with the word typed for it. */
export const SOUND_TAGS = NON_SPEECH_OPTIONS.map((option) => ({
  type: option.value,
  label: option.label,
  marker: WORDS[option.value] ?? option.value.replace(/_/g, "-"),
}));

export type SoundTag = (typeof SOUND_TAGS)[number];

/** The tags matching a search, by their word or their name. */
export function findSoundTags(query: string): SoundTag[] {
  const q = query.trim().toLowerCase();
  return SOUND_TAGS.filter((tag) => !q || tag.marker.includes(q) || tag.label.toLowerCase().includes(q));
}

/** How a stored mark reads in the text. */
export function markerText(type: string): string {
  return `[${SOUND_TAGS.find((tag) => tag.type === type)?.marker ?? type}]`;
}

/** The type a bracketed word stands for. */
function markerType(word: string): string | undefined {
  const lower = word.toLowerCase();
  return SOUND_TAGS.find((tag) => tag.marker === lower)?.type;
}

/** A word that is a known marker, e.g. `[laugh]`: not part of the transcript. */
export function isMarkerWord(word: string): boolean {
  const inner = /^\[([a-z-]+)\]$/i.exec(word)?.[1];
  return inner !== undefined && markerType(inner) !== undefined;
}

const MARKER = /\[([a-z-]*)\]/gi;
const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

/**
 * Takes markers out of a segment's text.
 *
 * Each known one becomes a mark after the word before it (`afterWord`, its
 * place in the cleaned text; the first word when it leads). An empty `[]` is
 * dropped. An unknown one stays, and is listed so the annotator can be told.
 * A marker touching a word (`Make[laugh]we`) still splits it from the words.
 */
export function extractMarkers(text: string) {
  const marks: { type: string; afterWord: number }[] = [];
  const unknown: string[] = [];
  let out = "";
  let last = 0;
  let changed = false;

  for (const match of text.matchAll(MARKER)) {
    out += text.slice(last, match.index);
    last = (match.index ?? 0) + match[0].length;
    const type = match[1] ? markerType(match[1]) : undefined;
    if (match[1] && !type) {
      out += match[0];
      unknown.push(match[0]);
      continue;
    }
    changed = true;
    if (type) marks.push({ type, afterWord: Math.max(0, wordCount(out) - 1) });
    out += " ";
  }
  out += text.slice(last);

  const cleaned = out.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
  return { text: changed ? cleaned : text, marks, unknown };
}

/** The reverse, for edit mode: each mark written back after its word. */
export function injectMarkers(text: string, marks: { type: string; afterWord: number }[]) {
  if (!marks.length) return text;
  const words = [...text.matchAll(/\S+/g)];
  let out = "";
  let last = 0;
  words.forEach((word, index) => {
    const end = (word.index ?? 0) + word[0].length;
    out += text.slice(last, end);
    last = end;
    for (const mark of marks) if (mark.afterWord === index) out += ` ${markerText(mark.type)}`;
  });
  return out + text.slice(last);
}

/**
 * The marker being typed at the caret: from an open `[` to the caret, with
 * a `]` right after the caret counted too (an annotator who types `[]` first).
 * Null when the caret isn't inside one.
 */
export function markerAtCaret(value: string, caret: number) {
  const open = /\[([a-z-]*)$/i.exec(value.slice(0, caret));
  if (!open) return null;
  /* Inside a finished marker (`[oth|er]`, `[laugh|]`) it is being changed, not typed. */
  const rest = /^([a-z-]*)\]/i.exec(value.slice(caret));
  if (rest && (rest[1] || markerType(open[1]))) return null;
  const closes = value[caret] === "]";
  return { from: caret - open[0].length, to: caret + (closes ? 1 : 0), query: open[1].toLowerCase() };
}

/**
 * Puts a chosen marker in place of the one being typed. Always a space
 * after it, and one before it when it would touch the word in front, so
 * `[` typed against a word never glues the two.
 */
export function insertMarker(value: string, at: { from: number; to: number }, marker: string) {
  const before = value.slice(0, at.from);
  const after = value.slice(at.to).replace(/^[ \t]+/, "");
  const lead = before && !/\s$/.test(before) ? " " : "";
  const added = `${lead}[${marker}] `;
  return { value: before + added + after, caret: before.length + added.length };
}

/** A whole known marker the caret is in or touching, for changing it in edit mode. */
export function markerAround(value: string, caret: number) {
  for (const match of value.matchAll(MARKER)) {
    const from = match.index ?? 0;
    const to = from + match[0].length;
    const type = match[1] ? markerType(match[1]) : undefined;
    if (type && caret >= from && caret <= to) return { from, to, type };
  }
  return null;
}

/** Swaps the marker at a range for another type's, or takes it out (null). */
export function replaceMarker(value: string, at: { from: number; to: number }, type: string | null) {
  if (type) return value.slice(0, at.from) + markerText(type) + value.slice(at.to);
  return (value.slice(0, at.from).replace(/[ \t]+$/, "") + " " + value.slice(at.to).replace(/^[ \t]+/, "")).trim();
}
