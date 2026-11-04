import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";
import { safeHref, toEmailHtml, toPlainText } from "../richBody";

const text = (value: string, marks?: JSONContent["marks"]): JSONContent => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
});
const p = (...content: JSONContent[]): JSONContent => ({ type: "paragraph", content });
const li = (value: string): JSONContent => ({ type: "listItem", content: [p(text(value))] });

const doc: JSONContent = {
  type: "doc",
  content: [
    p(text("Please read the "), text("new guidance", [{ type: "bold" }]), text(".")),
    { type: "bulletList", content: [li("Quiet room"), li("Phone close")] },
    { type: "orderedList", content: [li("Read"), li("Record")] },
    p(
      text("It is "),
      text("here", [{ type: "link", attrs: { href: "https://alvacoreai.com/guide" } }]),
      text(" and at "),
      text("https://alvacoreai.com", [{ type: "link", attrs: { href: "https://alvacoreai.com" } }])
    ),
  ],
};

describe("toPlainText", () => {
  /* What the API is sent while it takes plain text: nothing is lost. */
  it("spells formatting out so the plain email still reads", () => {
    expect(toPlainText(doc)).toBe(
      [
        "Please read the new guidance.",
        "• Quiet room\n• Phone close",
        "1. Read\n2. Record",
        "It is here (https://alvacoreai.com/guide) and at https://alvacoreai.com/",
      ].join("\n\n")
    );
  });

  it("is empty for an empty editor", () => {
    expect(toPlainText({ type: "doc", content: [{ type: "paragraph" }] })).toBe("");
  });
});

describe("toEmailHtml", () => {
  it("draws bold, lists and links in the template's styles", () => {
    const html = toEmailHtml(doc);
    expect(html).toContain("<strong");
    expect(html).toContain("<ul class=\"copy\"");
    expect(html).toContain("<ol class=\"copy\"");
    expect(html).toContain('href="https://alvacoreai.com/guide"');
  });

  /* Only the tags written here ever come out. */
  it("escapes text and refuses anything but https links", () => {
    const html = toEmailHtml({
      type: "doc",
      content: [
        p(
          text("<img src=x onerror=alert(1)>"),
          text("bad", [{ type: "link", attrs: { href: "javascript:alert(1)" } }])
        ),
      ],
    });
    expect(html).not.toContain("<img");
    expect(html).not.toContain("javascript:");
    expect(safeHref("http://example.com")).toBeNull();
  });
});
