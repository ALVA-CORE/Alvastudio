import { describe, expect, it } from "vitest";
import { parseBankCsv } from "../bankCsv";

describe("parseBankCsv", () => {
  it("skips a header row", () => {
    const { rows } = parseBankCsv("text,variety,category\nHello there,,");
    expect(rows).toHaveLength(1);
    expect(rows[0].text).toBe("Hello there");
  });

  /* Prompts are sentences, and sentences have commas in them. */
  it("keeps commas inside a quoted cell", () => {
    const { rows } = parseBankCsv('"Tell us about a day, any day.",Nigerian English,');
    expect(rows[0].text).toBe("Tell us about a day, any day.");
    expect(rows[0].variety).toBe("Nigerian English");
  });

  it("handles a doubled quote as a literal one", () => {
    const { rows } = parseBankCsv('"She said ""no"" twice.",,');
    expect(rows[0].text).toBe('She said "no" twice.');
  });

  it("falls back when variety and category are missing or loose", () => {
    const { rows } = parseBankCsv("Just the text\nAnother one,pidgin,nonsense");
    expect(rows[0].variety).toBe("Nigerian Pidgin");
    expect(rows[0].category).toBe("Everyday life");
    expect(rows[1].variety).toBe("Nigerian Pidgin");
    expect(rows[1].category).toBe("Everyday life");
  });

  it("matches a variety case-insensitively", () => {
    const { rows } = parseBankCsv("A prompt,NIGERIAN ENGLISH,");
    expect(rows[0].variety).toBe("Nigerian English");
  });

  /* A row with no text cannot be salvaged, and must not vanish silently. */
  it("reports rows it could not use", () => {
    const { rows, skipped } = parseBankCsv("Good one,,\n,Nigerian English,Everyday life");
    expect(rows).toHaveLength(1);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]).toMatch(/no text/);
  });

  it("returns nothing for an empty paste", () => {
    expect(parseBankCsv("   \n  ").rows).toHaveLength(0);
  });
});
