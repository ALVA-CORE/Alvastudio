import type { JSONContent } from "@tiptap/react";

/**
 * The email body, from the editor's document.
 *
 * Two renderings of one document:
 *
 * - `toPlainText` is what is sent. `body` is plain text on the API today
 *   (endpoints-needed #6), so formatting is spelled out rather than lost:
 *   a bullet becomes "• ", a numbered item "1. ", a link "words (url)".
 *   Paragraphs are separated by a blank line, which is how the server splits
 *   them.
 * - `toEmailHtml` is the formatted body for the preview, in the template's own
 *   inline styles. Every piece of text and every link is escaped; only the
 *   tags written here are ever produced.
 */

const TEXT = "#F5F5F4";
const MUTED = "#A1A1AA";
const ACCENT = "#25F07D";

type Mark = { type: string; attrs?: Record<string, unknown> };

function escape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/** HTTPS only, as the API asks of the button. Anything else is not a link. */
export function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

const linkOf = (marks: Mark[] | undefined) =>
  safeHref(marks?.find((mark) => mark.type === "link")?.attrs?.href);

/* ------------------------------------------------------------------ */
/* Plain text                                                          */
/* ------------------------------------------------------------------ */

function inlineText(nodes: JSONContent[] | undefined): string {
  let out = "";
  const runs = nodes ?? [];
  for (let index = 0; index < runs.length; index += 1) {
    const node = runs[index];
    if (node.type === "hardBreak") {
      out += "\n";
      continue;
    }
    if (node.type !== "text" || !node.text) continue;
    const href = linkOf(node.marks as Mark[] | undefined);
    if (!href) {
      out += node.text;
      continue;
    }
    /* One link can be split across runs by bold or italic. Gather the
       whole of it before saying where it goes, once. */
    let words = node.text;
    while (
      index + 1 < runs.length &&
      runs[index + 1].type === "text" &&
      linkOf(runs[index + 1].marks as Mark[] | undefined) === href
    ) {
      index += 1;
      words += runs[index].text ?? "";
    }
    const bare = href.replace(/\/$/, "");
    out += words === href || words === bare ? href : `${words} (${href})`;
  }
  return out;
}

function listText(node: JSONContent): string {
  const ordered = node.type === "orderedList";
  const start = Number(node.attrs?.start ?? 1) || 1;
  return (node.content ?? [])
    .map((item, index) => {
      const marker = ordered ? `${start + index}. ` : "• ";
      const parts = (item.content ?? []).map((child) =>
        child.type === "paragraph" ? inlineText(child.content) : blockText(child)
      );
      return marker + parts.filter(Boolean).join("\n   ");
    })
    .join("\n");
}

function blockText(node: JSONContent): string {
  if (node.type === "paragraph") return inlineText(node.content);
  if (node.type === "bulletList" || node.type === "orderedList") return listText(node);
  return inlineText(node.content);
}

export function toPlainText(doc: JSONContent | null | undefined): string {
  return (doc?.content ?? [])
    .map(blockText)
    .map((block) => block.trim())
    .filter(Boolean)
    .join("\n\n");
}

/* ------------------------------------------------------------------ */
/* Email HTML                                                          */
/* ------------------------------------------------------------------ */

function inlineHtml(nodes: JSONContent[] | undefined): string {
  return (nodes ?? [])
    .map((node) => {
      if (node.type === "hardBreak") return "<br>";
      if (node.type !== "text" || !node.text) return "";
      let html = escape(node.text);
      const marks = (node.marks ?? []) as Mark[];
      if (marks.some((mark) => mark.type === "italic")) html = `<em>${html}</em>`;
      if (marks.some((mark) => mark.type === "bold")) {
        html = `<strong style="color:${TEXT};font-weight:600;">${html}</strong>`;
      }
      const href = linkOf(marks);
      if (href) {
        html = `<a href="${escape(href)}" style="color:${ACCENT};text-decoration:underline;">${html}</a>`;
      }
      return html;
    })
    .join("");
}

const COPY = `margin:0 0 12px;font-size:15px;line-height:1.6;color:${MUTED};`;

function blockHtml(node: JSONContent): string {
  if (node.type === "bulletList" || node.type === "orderedList") {
    const tag = node.type === "orderedList" ? "ol" : "ul";
    const start = Number(node.attrs?.start ?? 1) || 1;
    const items = (node.content ?? [])
      .map(
        (item) =>
          `<li style="margin:0 0 6px;">${(item.content ?? [])
            .map((child) => (child.type === "paragraph" ? inlineHtml(child.content) : blockHtml(child)))
            .join("")}</li>`
      )
      .join("");
    return `<${tag} class="copy"${tag === "ol" && start !== 1 ? ` start="${start}"` : ""} style="${COPY}padding-left:22px;">${items}</${tag}>`;
  }
  const inner = inlineHtml(node.content);
  return inner ? `<p class="copy" style="${COPY}">${inner}</p>` : "";
}

export function toEmailHtml(doc: JSONContent | null | undefined): string {
  return (doc?.content ?? []).map(blockHtml).join("");
}
