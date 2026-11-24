import { tagFamily, type SpanKind } from "./tags";

/**
 * The workspace's keyboard shortcuts, written once: the shortcuts panel lists
 * these, the tooltips read their keys from here, and the tag keys are matched
 * here. "Mod" is ⌘ on a Mac and Ctrl elsewhere.
 */

export const isMac = () =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);

const MAC: Record<string, string> = { Mod: "⌘", Shift: "⇧", Alt: "⌥", Enter: "↩", Backspace: "⌫" };
const PC: Record<string, string> = { Mod: "Ctrl" };

/** "Mod+Shift+Z" as this computer writes it: ⌘⇧Z, or Ctrl+Shift+Z. */
export function keyLabel(keys: string, mac = isMac()): string {
  const parts = keys.split("+").map((key) => (mac ? MAC[key] : PC[key]) ?? key);
  return parts.join(mac ? "" : "+");
}

export type Shortcut = { label: string; keys: string; when?: string };

/**
 * Tag keys, for the highlighted words: Alt with a number for a language,
 * Alt+Shift with a number for a disfluency, in the menus' order. By key
 * position, as Option+number types a character on a Mac.
 */
const TAG_KEYS: { kind: SpanKind; shift: boolean }[] = [
  { kind: "language", shift: false },
  { kind: "disfluency", shift: true },
];

const tagKeys = TAG_KEYS.flatMap(({ kind, shift }) =>
  tagFamily(kind)
    .options.slice(0, 9)
    .map((option, i) => ({ kind, value: option.value, label: option.label, shift, digit: i + 1 }))
);

/** The tag a key press applies, or undefined. */
export function tagForKey(event: { altKey: boolean; shiftKey: boolean; code: string }) {
  const digit = /^Digit([1-9])$/.exec(event.code)?.[1];
  if (!event.altKey || !digit) return undefined;
  return tagKeys.find((key) => key.shift === event.shiftKey && key.digit === Number(digit));
}

export const SHORTCUTS: { title: string; items: Shortcut[] }[] = [
  {
    title: "Playback",
    items: [
      { label: "Play or pause", keys: "Space" },
      { label: "Play or pause while typing", keys: "Alt+Space" },
      { label: "Back or forward 2 seconds", keys: "←/→" },
      { label: "Back or forward 5 seconds", keys: "Shift+←/→" },
    ],
  },
  {
    title: "Editing",
    items: [
      { label: "Undo", keys: "Mod+Z" },
      { label: "Redo", keys: "Mod+Shift+Z" },
      { label: "Save now", keys: "Mod+S" },
      { label: "Split the segment at the caret", keys: "Mod+Enter" },
      { label: "Join with the segment above", keys: "Backspace", when: "at the start" },
      { label: "Delete the selected segment", keys: "Delete" },
      { label: "Clear the selection", keys: "Esc" },
    ],
  },
  {
    title: "Tagging",
    items: [
      { label: "Open the tag menu for the highlighted words", keys: "Alt+T" },
      { label: "Insert a sound tag", keys: "[", when: "while typing" },
      { label: "Pick from the list", keys: "↑/↓+Enter" },
      ...tagKeys.map((key) => ({
        label: key.label,
        keys: `Alt+${key.shift ? "Shift+" : ""}${key.digit}`,
        when: tagFamily(key.kind).label.toLowerCase(),
      })),
    ],
  },
];
