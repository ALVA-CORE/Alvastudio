import { describe, expect, it } from "vitest";
import {
  BANK_IMPORT_MAX_ROWS,
  BatchImportError,
  bankRowsToCsv,
  importInBatches,
  parseBankCsv,
  type BankCsvRow,
} from "../bankCsv";

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

  it("falls back when variety is missing, and reads a loose one", () => {
    const { rows } = parseBankCsv("Just the text\nAnother one,pidgin,Food");
    expect(rows[0].variety).toBe("Nigerian Pidgin");
    expect(rows[1].variety).toBe("Nigerian Pidgin");
    expect(rows[1].category).toBe("Food");
    expect(rows).toHaveLength(2);
  });

  /* A guess would file a Yoruba prompt under Pidgin with nobody the wiser. */
  it("refuses a variety it cannot place", () => {
    const { rows, skipped } = parseBankCsv("text,variety\nBawo ni,Yoruba");
    expect(rows).toHaveLength(0);
    expect(skipped[0]).toMatch(/line 2.*Yoruba/);
  });

  /* The file that started this: headers named, API values not used. */
  it("reads columns by header name, in any order", () => {
    const { rows } = parseBankCsv(
      "category,text,language_variety\nEntertainment,Tarzan living in a jungle,nigerian_english"
    );
    expect(rows[0]).toMatchObject({
      text: "Tarzan living in a jungle",
      variety: "Nigerian English",
      category: "Entertainment",
      line: 2,
    });
  });

  it("keeps a line break inside a quoted cell as one prompt", () => {
    const { rows } = parseBankCsv('text,variety\n"Line one\nline two",Nigerian Pidgin\nNext,');
    expect(rows).toHaveLength(2);
    expect(rows[0].text).toBe("Line one\nline two");
    expect(rows[1].line).toBe(4);
  });

  it("ignores an Excel byte-order mark on the header", () => {
    const { rows } = parseBankCsv("\ufefftext,variety\nHello,Nigerian English");
    expect(rows).toHaveLength(1);
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

describe("bankRowsToCsv", () => {
  /* What the import route reads: these headers, the API's enum values. */
  it("writes the shape the API takes", () => {
    const { rows } = parseBankCsv(
      'text,variety,category\n"Dora\'s boot, from Aba",Nigerian English,Entertainment\nWetin dey,,'
    );
    expect(bankRowsToCsv(rows)).toBe(
      [
        "text,language_variety,category",
        '"Dora\'s boot, from Aba",nigerian_english,Entertainment',
        "Wetin dey,nigerian_pidgin,",
      ].join("\r\n")
    );
  });
});

/* jsdom's File has no `.text()`. */
const readText = (file: File) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(file);
  });

describe("importInBatches", () => {
  const rows = (count: number): BankCsvRow[] =>
    Array.from({ length: count }, (_, index) => ({
      text: `Prompt ${index}`,
      variety: "Nigerian Pidgin" as const,
      line: index + 2,
    }));

  /* The route refuses a file over its limit, so 60,000 rows go as twelve. */
  it("splits a bank over the route's limit and adds the results up", async () => {
    const sizes: number[] = [];
    const result = await importInBatches(rows(BANK_IMPORT_MAX_ROWS * 2 + 10), async (file) => {
      const lines = (await readText(file)).split("\r\n").length - 1;
      sizes.push(lines);
      return { added: lines, skipped: 0, failed: 0 };
    });
    expect(sizes).toEqual([BANK_IMPORT_MAX_ROWS, BANK_IMPORT_MAX_ROWS, 10]);
    expect(result).toMatchObject({ added: BANK_IMPORT_MAX_ROWS * 2 + 10, batches: 3, sent: 3 });
  });

  it("puts a failure back on its line in the person's file", async () => {
    let call = 0;
    const result = await importInBatches(rows(BANK_IMPORT_MAX_ROWS + 5), async () => {
      call += 1;
      return call === 2
        ? { added: 4, skipped: 0, failed: 1, failures: [{ line: 3, reason: "text is blank" }] }
        : { added: BANK_IMPORT_MAX_ROWS, skipped: 0, failed: 0 };
    });
    /* Batch two, second row: overall row 5001, on line 5003 of the file. */
    expect(result.firstFailure).toEqual({ line: BANK_IMPORT_MAX_ROWS + 3, reason: "text is blank" });
  });

  it("says how far it got when a batch throws", async () => {
    let call = 0;
    const error = await importInBatches(rows(BANK_IMPORT_MAX_ROWS * 3), async () => {
      call += 1;
      if (call === 2) throw new Error("502");
      return { added: BANK_IMPORT_MAX_ROWS, skipped: 0, failed: 0 };
    }).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(BatchImportError);
    expect((error as BatchImportError).progress).toMatchObject({ sent: 1, batches: 3 });
  });
});
