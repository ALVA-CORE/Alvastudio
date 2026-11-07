import { describe, expect, it } from "vitest";
import fixture from "./emailTemplate.fixture.json";
import { actionUrlProblem, bodyParagraphs, renderEmailHtml } from "../emailTemplate";

/**
 * The live preview is a copy of the backend's template, and a copy drifts.
 *
 * `emailTemplate.fixture.json` is the backend's own `render()` (origin/main,
 * 6 Nov), run with the inputs below. If the backend template changes,
 * regenerate it from `app/services/email_templates.py` and make this pass
 * again, or the preview stops being what contributors receive.
 */
const sameYear = (html: string) => html.replace(/© \d{4} Alvacore/g, "© YEAR Alvacore");

describe("renderEmailHtml", () => {
  it("draws exactly what the backend sends", () => {
    const html = renderEmailHtml({
      name: "Ada",
      title: "Recording guidance & you",
      body: fixture.body,
      action: "Read the guidance",
      url: "https://studio.alvacoreai.com/contributor/dashboard?a=1&b=2",
    });
    expect(sameYear(html)).toBe(sameYear(fixture.html));
  });

  /* HTML in a message is text, never markup, on both sides. */
  it("escapes what the admin types", () => {
    const html = renderEmailHtml({
      title: "<script>x</script>",
      body: "<img src=x onerror=alert(1)>",
      action: "Go",
      url: "https://example.com",
    });
    expect(html).not.toContain("<script>x");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("splits paragraphs as the server does", () => {
    expect(bodyParagraphs("  One\r\nline\r\n\r\nTwo  ")).toEqual(["One\nline", "Two"]);
  });
});

describe("actionUrlProblem", () => {
  it("takes what the API takes", () => {
    expect(actionUrlProblem("https://studio.alvacoreai.com/x")).toBeNull();
    expect(actionUrlProblem("http://studio.alvacoreai.com")).toMatch(/https/);
    expect(actionUrlProblem("https://user:pw@example.com")).toMatch(/password/);
    expect(actionUrlProblem("https://exa mple.com")).toMatch(/spaces/);
    expect(actionUrlProblem("studio.alvacoreai.com")).toMatch(/https/);
  });
});
