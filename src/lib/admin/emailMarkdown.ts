/**
 * The Markdown subset an email body is written in (`body_format: markdown`).
 *
 * A copy of the backend's `app/services/email_markdown.py` (origin/main,
 * 6 Nov) and `links.py`, so the live preview draws a body exactly as the
 * server will. The parity test runs both on the same input; if either file
 * changes on the backend, change it here and regenerate the fixture.
 *
 * - blocks: paragraphs (blank line between), `- ` bullets, `1. ` numbers;
 *   consecutive lines of one kind make one block;
 * - inline: `**bold**`, `*italic*` (italic may sit inside bold), and
 *   `[words](https://...)` links.
 *
 * Every character reaches the HTML escaped; markup is only produced here.
 */

const ACCENT = "#25F07D";
const MUTED = "#A1A1AA";

/* Python's `\w` on str is Unicode: letters, digits and the underscore. */
const W = "[\\p{L}\\p{N}_]";

const INLINE = new RegExp(
  String.raw`\[(?<words>[^\[\]\n]+)\]\((?<url>[^()\s]+)\)` +
    String.raw`|\*\*(?<bold>(?:(?!\*\*)[^\n])+?)\*\*` +
    `|(?<![*${W.slice(1, -1)}])\\*(?<italic>[^*\\n]+?)\\*(?![*${W.slice(1, -1)}])`,
  "gu"
);
const BULLET = /^- (?<item>.*)$/u;
const NUMBERED = /^(?<n>\d{1,3})\. (?<item>.*)$/u;

const COPY = `margin:0 0 12px;font-size:15px;line-height:1.6;color:${MUTED};`;
const LIST = `margin:0 0 12px;padding-left:22px;font-size:15px;line-height:1.6;color:${MUTED};`;
const ITEM = "margin:0 0 4px;";
const LINK = `color:${ACCENT};text-decoration:underline;`;

/**
 * Light text that Gmail's dark mode does not darken (`light()` in the
 * backend's `email_templates.py`). Gmail inverts text colour; under its
 * `u + .body` only, these two blends invert it back. Goes inside a block
 * element, never around one. `html` is already escaped.
 *
 * Here rather than in `emailTemplate.ts`, which imports this file.
 */
export function light(html: string) {
  return `<span class="gmail-screen"><span class="gmail-difference">${html}</span></span>`;
}

/** Python's `html.escape(value, quote=True)`. */
function escape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/** `links.https_url_problem`: why a link is refused, or null. */
export function httpsUrlProblem(value: string): string | null {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (/\s/u.test(char) || code < 32 || code === 127) {
      return "it contains whitespace or control characters";
    }
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return "it is not a valid URL";
  }
  if (parsed.protocol !== "https:") return "it must start with https://";
  if (!parsed.hostname) return "it has no host";
  if (parsed.username || parsed.password) return "it must not carry a username or password";
  if (parsed.port === "0") return "it has an invalid port";
  return null;
}

function inline(text: string, links = true): [string, string] {
  const html: string[] = [];
  const plain: string[] = [];
  let at = 0;
  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0;
    html.push(escape(text.slice(at, start)));
    plain.push(text.slice(at, start));
    at = start + match[0].length;
    const groups = match.groups ?? {};
    if (groups.words !== undefined) {
      const url = groups.url;
      if (!links || httpsUrlProblem(url)) {
        html.push(escape(match[0]));
        plain.push(match[0]);
        continue;
      }
      const [wordsHtml, wordsPlain] = inline(groups.words, false);
      html.push(`<a href="${escape(url)}" style="${LINK}">${wordsHtml}</a>`);
      plain.push(`${wordsPlain} (${url})`);
    } else if (groups.bold !== undefined) {
      const [innerHtml, innerPlain] = inline(groups.bold, links);
      html.push(`<strong>${innerHtml}</strong>`);
      plain.push(innerPlain);
    } else {
      const [innerHtml, innerPlain] = inline(groups.italic, links);
      html.push(`<em>${innerHtml}</em>`);
      plain.push(innerPlain);
    }
  }
  html.push(escape(text.slice(at)));
  plain.push(text.slice(at));
  return [html.join(""), plain.join("")];
}

type Kind = "bullet" | "numbered" | "text" | "break";

const kindOf = (line: string): Kind =>
  BULLET.test(line) ? "bullet" : NUMBERED.test(line) ? "numbered" : "text";

function blocks(body: string): [Kind, string[]][] {
  const out: [Kind, string[]][] = [];
  for (const line of body.split("\n")) {
    if (!line.trim()) {
      out.push(["break", []]);
      continue;
    }
    const kind = kindOf(line);
    const last = out[out.length - 1];
    if (last && last[0] === kind) last[1].push(line);
    else out.push([kind, [line]]);
  }
  return out.filter(([kind]) => kind !== "break");
}

export type RenderedMarkdown = { html: string[]; paragraphs: string[] };

export function renderMarkdown(body: string): RenderedMarkdown {
  const html: string[] = [];
  const paragraphs: string[] = [];
  for (const [kind, lines] of blocks(body)) {
    if (kind === "text") {
      const parts = lines.map((line) => inline(line));
      html.push(`<p class="copy muted" style="${COPY}">` + light(parts.map(([h]) => h).join("<br>")) + "</p>");
      paragraphs.push(parts.map(([, p]) => p).join("\n"));
      continue;
    }
    const pattern = kind === "bullet" ? BULLET : NUMBERED;
    const items = lines.map((line) => line.match(pattern)!);
    const parts = items.map((item) => inline(item.groups!.item));
    const tag = kind === "bullet" ? "ul" : "ol";
    const first = kind === "numbered" ? Number.parseInt(items[0].groups!.n, 10) : 1;
    const start = kind === "numbered" && first !== 1 ? ` start="${first}"` : "";
    html.push(
      `<${tag}${start} class="copy muted" style="${LIST}">` +
        parts.map(([h]) => `<li style="${ITEM}">${light(h)}</li>`).join("") +
        `</${tag}>`
    );
    paragraphs.push(
      kind === "bullet"
        ? parts.map(([, p]) => `• ${p}`).join("\n")
        : items.map((item, index) => `${item.groups!.n}. ${parts[index][1]}`).join("\n")
    );
  }
  return { html, paragraphs };
}
