import type { JSONContent } from "@tiptap/react";
import { httpsUrlProblem } from "@/lib/admin/emailMarkdown";

/**
 * The editor's document as the Markdown subset the API renders
 * (`body_format: markdown`, see `emailMarkdown.ts`).
 *
 * The backend's subset has no escape character, so text that would read as
 * markup is kept from doing so here:
 *
 * - a typed `*` becomes `∗` (U+2217), which looks the same and is not a
 *   marker;
 * - a line of text starting `- ` or `1. ` gets a zero-width space in front,
 *   so it stays a sentence rather than becoming a list;
 * - italic that starts or ends inside a word is dropped, because the server
 *   would not read it as italic and would show the asterisks;
 * - italic at the edge of bold is kept apart from the bold markers by a
 *   zero-width space, so `***` never forms.
 *
 * Lists are one level deep, as in the subset; nested items are lifted up.
 */

type Mark = { type: string; attrs?: Record<string, unknown> };

/** HTTPS only, as the API asks of every link. */
export function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return httpsUrlProblem(value) ? null : value;
}

type Run = { text: string; bold: boolean; italic: boolean; href: string | null };

const WORD = /[\p{L}\p{N}_]/u;

/** Text the subset would misread, made literal. */
const literal = (text: string) => text.replace(/\*/g, "∗");

function runsOf(nodes: JSONContent[] | undefined): Run[][] {
  /* Split on hard breaks: each becomes its own line of the paragraph. */
  const lines: Run[][] = [[]];
  for (const node of nodes ?? []) {
    if (node.type === "hardBreak") {
      lines.push([]);
      continue;
    }
    if (node.type !== "text" || !node.text) continue;
    const marks = (node.marks ?? []) as Mark[];
    lines[lines.length - 1].push({
      text: literal(node.text),
      bold: marks.some((mark) => mark.type === "bold"),
      italic: marks.some((mark) => mark.type === "italic"),
      href: safeHref(marks.find((mark) => mark.type === "link")?.attrs?.href),
    });
  }
  return lines;
}

/** Consecutive runs sharing `key`, as groups. */
function group<K>(runs: Run[], key: (run: Run) => K): { key: K; runs: Run[] }[] {
  const out: { key: K; runs: Run[] }[] = [];
  for (const run of runs) {
    const k = key(run);
    const last = out[out.length - 1];
    if (last && last.key === k) last.runs.push(run);
    else out.push({ key: k, runs: [run] });
  }
  return out;
}

/** Italic only where the server will read it: not touching a word. */
function italics(runs: Run[], before: string, after: string): string {
  const parts = group(runs, (run) => run.italic);
  return parts
    .map((part, index) => {
      const text = part.runs.map((run) => run.text).join("");
      if (!part.key || !text.trim()) return text;
      const prev = index > 0 ? parts[index - 1].runs.map((r) => r.text).join("").slice(-1) : before;
      const next =
        index < parts.length - 1 ? parts[index + 1].runs.map((r) => r.text).join("").slice(0, 1) : after;
      if (WORD.test(prev) || WORD.test(next)) return text;
      /* The marker hugs the words; spaces at the edges stay outside it. */
      const lead = text.match(/^\s*/)?.[0] ?? "";
      const tail = text.match(/\s*$/)?.[0] ?? "";
      return `${lead}*${text.trim()}*${tail}`;
    })
    .join("");
}

function bolds(runs: Run[], before: string, after: string): string {
  return group(runs, (run) => run.bold)
    .map((part) => {
      const inner = italics(part.runs, before, after);
      if (!part.key || !inner.trim()) return inner;
      const lead = inner.match(/^\s*/)?.[0] ?? "";
      const tail = inner.match(/\s*$/)?.[0] ?? "";
      /* Italic at either edge of bold would put `***` together, which the
         server reads as bold around an unclosed italic and shows the
         asterisk. A zero-width space between the markers keeps them apart. */
      let words = inner.trim();
      if (words.startsWith("*")) words = `\u200b${words}`;
      if (words.endsWith("*")) words = `${words}\u200b`;
      return `${lead}**${words}**${tail}`;
    })
    .join("");
}

function line(runs: Run[]): string {
  const links = group(runs, (run) => run.href);
  return links
    .map((part, index) => {
      const before = index > 0 ? links[index - 1].runs.map((r) => r.text).join("").slice(-1) : " ";
      const after =
        index < links.length - 1 ? links[index + 1].runs.map((r) => r.text).join("").slice(0, 1) : " ";
      const text = bolds(part.runs, before, after);
      if (!part.key || !text.trim()) return text;
      /* Square brackets would end the link's words early. */
      return `[${text.replace(/[[\]]/g, "")}](${part.key})`;
    })
    .join("");
}

/** A line of a paragraph that must not turn into a list item. */
const notAList = (text: string) => (/^(- |\d{1,3}\. )/.test(text) ? `\u200b${text}` : text);

function paragraph(node: JSONContent): string {
  return runsOf(node.content)
    .map((runs) => notAList(line(runs).trim()))
    .filter(Boolean)
    .join("\n");
}

function list(node: JSONContent): string[] {
  const ordered = node.type === "orderedList";
  const start = Number(node.attrs?.start ?? 1) || 1;
  const items: string[] = [];
  for (const item of node.content ?? []) {
    const words: string[] = [];
    const nested: string[] = [];
    for (const child of item.content ?? []) {
      if (child.type === "paragraph") {
        words.push(paragraph(child).replace(/\n/g, " "));
      } else if (child.type === "bulletList" || child.type === "orderedList") {
        /* Nested lists are lifted to the same level, after their parent:
           the subset has one level. */
        nested.push(...list(child).map((entry) => entry.replace(/^(- |\d{1,3}\. )/, "")));
      }
    }
    const text = words.filter(Boolean).join(" ");
    if (text) items.push(text);
    items.push(...nested);
  }
  return items.map((text, index) => (ordered ? `${start + index}. ${text}` : `- ${text}`));
}

export function toMarkdown(doc: JSONContent | null | undefined): string {
  const blocks: string[] = [];
  for (const node of doc?.content ?? []) {
    if (node.type === "bulletList" || node.type === "orderedList") {
      const lines = list(node);
      if (lines.length) blocks.push(lines.join("\n"));
    } else {
      const text = paragraph(node);
      if (text) blocks.push(text);
    }
  }
  return blocks.join("\n\n");
}
