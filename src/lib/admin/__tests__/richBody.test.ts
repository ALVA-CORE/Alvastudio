import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";
import fixture from "./emailMarkdown.fixture.json";
import { renderMarkdown } from "../emailMarkdown";
import { renderEmailHtml } from "../emailTemplate";
import { toMarkdown } from "../richBody";

/**
 * `emailMarkdown.fixture.json` is the backend's own `email_markdown.render`
 * and `email_templates.render` (origin/main, 5 Nov) on the body inside it. If
 * either changes on the backend, regenerate the fixture from them.
 */
describe("renderMarkdown", () => {
  it("draws a body exactly as the server does", () => {
    const rendered = renderMarkdown(fixture.body);
    expect(rendered.html).toEqual(fixture.html);
    expect(rendered.paragraphs).toEqual(fixture.paragraphs);
  });

  it("puts it in the email exactly as the server does", () => {
    const html = renderEmailHtml({
      name: "Ada",
      title: "Guidance",
      body: fixture.body,
      action: "Open Alva Studio",
      url: "https://studio.alvacoreai.com/",
      markdown: true,
    });
    const year = (value: string) => value.replace(/© \d{4} Alvacore/g, "© YEAR Alvacore");
    expect(year(html)).toBe(year(fixture.email));
  });
});

const text = (value: string, ...marks: JSONContent["marks"][]): JSONContent => ({
  type: "text",
  text: value,
  ...(marks.length ? { marks: marks.flat() } : {}),
});
const bold = [{ type: "bold" }];
const italic = [{ type: "italic" }];
const link = (href: string) => [{ type: "link", attrs: { href } }];
const p = (...content: JSONContent[]): JSONContent => ({ type: "paragraph", content });
const li = (...content: JSONContent[]): JSONContent => ({ type: "listItem", content: [p(...content)] });
const doc = (...content: JSONContent[]): JSONContent => ({ type: "doc", content });

/** What the server will make of what the editor holds. */
const sent = (value: JSONContent) => renderMarkdown(toMarkdown(value));

describe("toMarkdown", () => {
  it("writes the subset the server renders", () => {
    const md = toMarkdown(
      doc(
        p(text("Read the "), text("new guidance", bold), text(".")),
        { type: "bulletList", content: [li(text("Quiet room")), li(text("Phone close"))] },
        { type: "orderedList", content: [li(text("Read")), li(text("Record"))] },
        p(text("It is "), text("here", link("https://alvacoreai.com/guide")), text("."))
      )
    );
    expect(md).toBe(
      [
        "Read the **new guidance**.",
        "- Quiet room\n- Phone close",
        "1. Read\n2. Record",
        "It is [here](https://alvacoreai.com/guide).",
      ].join("\n\n")
    );
  });

  /* Bold and italic ending together used to come out as `***`. */
  it("keeps italic at the edge of bold intact", () => {
    const out = sent(doc(p(text("new ", bold), text("guidance", bold, italic))));
    expect(out.html[0]).toContain("<strong>new <em>guidance</em>");
    expect(out.paragraphs[0]).not.toContain("*");
  });

  /* The subset has no escape, so typed text must not turn into markup. */
  it("keeps typed asterisks and list-looking lines as text", () => {
    const out = sent(doc(p(text("5 * 3 * 2 is thirty")), p(text("- not a list")), p(text("1. nor this"))));
    expect(out.html.join("")).not.toContain("<em>");
    expect(out.html.join("")).not.toContain("<ul");
    expect(out.html.join("")).not.toContain("<ol");
    expect(out.paragraphs[0]).toContain("5 ∗ 3 ∗ 2");
  });

  /* The server would not read it as italic, and would show the asterisks. */
  it("drops italic that sits inside a word", () => {
    const out = sent(doc(p(text("un"), text("break", italic), text("able"))));
    expect(out.paragraphs[0]).toBe("unbreakable");
  });

  it("lets bold sit inside a link, and drops a link that is not https", () => {
    const out = sent(
      doc(
        p(text("See "), text("the ", link("https://a.com")), text("guide", link("https://a.com"), bold)),
        p(text("bad", link("http://a.com")))
      )
    );
    expect(out.html[0]).toContain('<a href="https://a.com"');
    expect(out.html[0]).toContain("<strong>guide</strong>");
    expect(out.paragraphs[1]).toBe("bad");
  });

  it("lifts a nested list to one level, after its parent", () => {
    const md = toMarkdown(
      doc({
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [p(text("Parent")), { type: "bulletList", content: [li(text("Child"))] }],
          },
        ],
      })
    );
    expect(md).toBe("- Parent\n- Child");
  });
});
