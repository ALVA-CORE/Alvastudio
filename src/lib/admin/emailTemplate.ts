/**
 * The branded email, drawn in the browser for the live preview.
 *
 * A copy of `render()` in the backend's `app/services/email_templates.py`
 * (origin/main, 4 Nov), kept as close to line for line as the two languages
 * allow. It exists so the preview can follow every keystroke without a save
 * and a round trip each time.
 *
 * **It is not what is sent.** The server renders the real thing, and the
 * send dialog shows the server's own `GET /communications/{id}/preview` before
 * anyone confirms, so a drift between the two shows up there rather than in
 * somebody's inbox. If the template changes on the backend, change it here.
 */

const BG = "#090909";
const CARD = "#202020";
const TEXT = "#F5F5F4";
const MUTED = "#A1A1AA";
const ACCENT = "#25F07D";
const LINE = "#2A2A2A";

const ASSETS = "https://api.alvacoreai.com/static/email";
const LOGO = `${ASSETS}/logo.png`;
const X_ICON = `${ASSETS}/x.png`;
const LINKEDIN_ICON = `${ASSETS}/linkedin.png`;

/** `hero_for("communication")` on the backend: the brand image. */
export const COMMUNICATION_HERO = "https://www.alvacoreai.com/assets/og.png";

/** The other image the backend's templates use, for welcome and work emails. */
export const EVERYDAY_HERO = "https://www.alvacoreai.com/assets/how/everyday.png";

const X_URL = "https://x.com";
const LINKEDIN_URL = "https://www.linkedin.com";
const SUPPORT = "support@alvacoreai.com";
const TERMS = "https://alvacoreai.com/terms";
const PRIVACY = "https://alvacoreai.com/privacy";

/** What the button says and where it goes when the admin sets neither. */
export const DEFAULT_ACTION_LABEL = "Open Alva Studio";
export const DEFAULT_ACTION_URL = "https://studio.alvacoreai.com/";

const FONT = "'Schibsted Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

/** Python's `html.escape(value, quote=True)`. */
function escape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function lockup(logo: string, color: string) {
  return `<table role="presentation" cellspacing="0" cellpadding="0"><tr>
<td valign="middle"><img class="mark" src="${logo}" alt="" width="32" height="32" style="display:block;width:32px;height:32px;border:0;"></td>
<td class="word" valign="middle" style="padding-left:10px;font-size:16px;font-weight:600;line-height:1;color:${color};">Alvacore</td>
</tr></table>`;
}

function social(href: string, icon: string, label: string) {
  return `<a href="${href}" aria-label="${label}" class="social-gap" style="display:inline-block;vertical-align:middle;text-decoration:none;margin-left:8px;"><table role="presentation" class="social" cellspacing="0" cellpadding="0" width="36" height="36" bgcolor="${CARD}" style="width:36px;height:36px;border-radius:999px;background:${CARD};"><tr><td align="center" valign="middle" width="36" height="36" style="width:36px;height:36px;line-height:0;font-size:0;"><img src="${icon}" alt="" width="16" height="16" style="display:block;width:16px;height:16px;border:0;"></td></tr></table></a>`;
}

/**
 * The server's `body.split("\n\n")`, after its own clean-up: CRLF becomes LF
 * and the whole is trimmed.
 */
export function bodyParagraphs(body: string) {
  return body.replace(/\r\n/g, "\n").trim().split("\n\n");
}

export function renderEmailHtml({
  name = "Ada",
  title,
  body,
  action,
  url,
  hero = COMMUNICATION_HERO,
}: {
  /** A sample, as the server's preview uses. Real messages use each name. */
  name?: string;
  title: string;
  body: string;
  action: string;
  url: string;
  hero?: string;
}) {
  const paragraphs = bodyParagraphs(body);
  const greeting = `Hi ${name},`;
  const year = new Date().getUTCFullYear();
  const copy = paragraphs
    .map(
      (p) =>
        `<p class="copy" style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${MUTED};">${escape(p).replace(/\n/g, "<br>")}</p>`
    )
    .join("");
  const helpLine = `Need help? Contact <a href="mailto:${SUPPORT}" style="color:${ACCENT};text-decoration:underline;">${SUPPORT}</a>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${escape(title)}</title>
<style>
  @media only screen and (max-width:480px) {
    .outer { padding:16px 10px !important; }
    .hero-wrap { padding:14px 16px 0 !important; }
    .hero { max-height:150px !important; }
    .copy-wrap { padding:18px 16px 0 !important; }
    .title { font-size:22px !important; margin-bottom:10px !important; }
    .copy { font-size:14px !important; margin-bottom:10px !important; }
    .button-wrap { padding:22px 16px 4px !important; }
    .rule { padding:16px 16px 0 !important; }
    .legal { padding:14px 16px 0 !important; font-size:11px !important; }
    .footer-wrap { padding:12px 12px 14px !important; }
    .footer { border-radius:14px !important; }
    .mark { width:26px !important; height:26px !important; }
    .word { font-size:14px !important; padding-left:8px !important; }
    .social { width:32px !important; height:32px !important; }
    .social-gap { margin-left:6px !important; }
  }
</style>
</head>
<body style="margin:0;background:${BG};color:${TEXT};font-family:${FONT};">
<div style="display:none;max-height:0;overflow:hidden;">${escape(paragraphs[0] ?? "")}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG};">
<tr><td class="outer" align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
<tr><td bgcolor="${CARD}" style="background:${CARD};border-radius:28px;">

<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td class="hero-wrap" style="padding:22px 24px 0;">
<img class="hero" src="${escape(hero)}" alt="" width="512" style="display:block;width:100%;max-height:220px;object-fit:cover;border:0;border-radius:16px;">
</td></tr>
<tr><td class="copy-wrap" align="left" style="padding:28px 24px 0;">
<h1 class="title" style="margin:0 0 16px;font-size:28px;line-height:1.2;font-weight:600;letter-spacing:-0.5px;color:${TEXT};text-align:left;">${escape(title)}</h1>
<p class="copy" style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${TEXT};text-align:left;">${escape(greeting)}</p>
${copy}
<p class="copy" style="margin:0;font-size:15px;line-height:1.6;color:${MUTED};text-align:left;">${helpLine}</p>
</td></tr>
<tr><td class="button-wrap" align="center" style="padding:32px 24px 8px;">
<table role="presentation" cellspacing="0" cellpadding="0" align="center"><tr>
<td bgcolor="${ACCENT}" align="center" style="background:${ACCENT};border-radius:999px;">
<a href="${escape(url)}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:${ACCENT};color:${BG};font-size:14px;font-weight:600;line-height:1;text-decoration:none;">${escape(action)}</a>
</td>
</tr></table>
</td></tr>
<tr><td class="rule" style="padding:20px 24px 0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
<td bgcolor="${LINE}" height="1" style="height:1px;font-size:0;line-height:0;background:${LINE};">&nbsp;</td>
</tr></table>
</td></tr>
<tr><td class="legal" style="padding:16px 24px 0;font-size:12px;line-height:1.4;color:${MUTED};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
<td align="left" valign="middle" style="color:${MUTED};">© ${year} Alvacore</td>
<td align="right" valign="middle" style="color:${MUTED};white-space:nowrap;">
<a href="${TERMS}" style="color:${MUTED};text-decoration:none;">Terms of use</a>
&nbsp;·&nbsp;
<a href="${PRIVACY}" style="color:${MUTED};text-decoration:none;">Privacy</a>
</td>
</tr></table>
</td></tr>
<tr><td class="footer-wrap" style="padding:14px 16px 16px;">
<table class="footer" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${BG}" style="background:${BG};border-radius:16px;">
<tr>
<td valign="middle" align="left" style="padding:14px 8px 14px 18px;">
${lockup(escape(LOGO), TEXT)}
</td>
<td align="right" valign="middle" style="padding:14px 18px 14px 8px;white-space:nowrap;">
${social(X_URL, escape(X_ICON), "X")}${social(LINKEDIN_URL, escape(LINKEDIN_ICON), "LinkedIn")}
</td>
</tr>
</table>
</td></tr>
</table>

</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * The API's rule for a custom button link: HTTPS, a host, no credentials,
 * no whitespace. Checked here so the editor can say so before a 422 does.
 */
export function actionUrlProblem(value: string): string | null {
  if (!value) return null;
  if (/\s/.test(value)) return "A link cannot contain spaces.";
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return "That is not a full link. Start it with https://";
  }
  if (parsed.protocol !== "https:") return "The link must start with https://";
  if (!parsed.hostname) return "The link needs a site name.";
  if (parsed.username || parsed.password) return "A link cannot carry a username or password.";
  return null;
}
