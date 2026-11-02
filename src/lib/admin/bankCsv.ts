import { VARIETIES, type Variety } from "@/data/admin/shared";
import type { BankDraft } from "@/components/admin/prompts/BankItemForm";
import type { ApiLanguageVariety } from "@/lib/api/enums";

/**
 * What `POST /prompts/import` and `POST /stimuli/import` actually read.
 *
 * Headers are required and matched by name: `text` and `language_variety`,
 * with `category` optional. `language_variety` must be the API's enum value,
 * so `nigerian_english` and not "Nigerian English". A file with a `variety`
 * header is refused outright for a missing column.
 *
 * Nobody writing prompts in a spreadsheet should have to know that, so the
 * dialog parses whatever they give it and sends the server this shape
 * instead (see `bankRowsToCsv`).
 */
export const BANK_CSV_TEMPLATE = [
  "text,variety,category",
  '"Tell us about a market day you still remember.",Nigerian English,Everyday life',
  '"Wetin you go tell person wey just land Naija?",Nigerian Pidgin,Travel and transport',
].join("\n");

/** The API's column limit on `category`. */
const CATEGORY_MAX = 64;

export type BankCsvRow = BankDraft & {
  category?: string;
  /** 1-based line in the person's file, counting the header. */
  line: number;
};

export type BankCsvProblem = { line: number; reason: string };

export type BankCsvResult = {
  rows: BankCsvRow[];
  /** One readable line per rejected row, for the preview. */
  skipped: string[];
  /** The same rejections, structured, so a table can place them in order. */
  problems: BankCsvProblem[];
};

type Column = "text" | "variety" | "category";

/**
 * Header names we accept for each column, lowercased with spaces and
 * dashes folded to underscores. The person writing the file picks the
 * wording, not us.
 */
const HEADER_ALIASES: Record<Column, string[]> = {
  text: ["text", "prompt", "stimulus", "stimuli", "sentence", "content"],
  variety: ["variety", "language_variety", "language", "lang"],
  category: ["category", "topic", "theme", "domain"],
};

/**
 * Parses a pasted or uploaded prompt bank.
 *
 * Forgiving about everything except the text. A linguist's export may or
 * may not have a header row, may write a variety as "pidgin" rather than
 * "Nigerian Pidgin", and may put the columns in any order once they are
 * named. None of that is worth refusing a file over. What cannot be
 * salvaged (no text, or a variety we cannot place) is reported, never
 * dropped silently.
 */
export function parseBankCsv(input: string): BankCsvResult {
  const rows: BankCsvRow[] = [];
  const problems: BankCsvProblem[] = [];
  const reject = (line: number, reason: string) => problems.push({ line, reason });
  const result = () => ({
    rows,
    problems,
    skipped: problems.map((problem) => `line ${problem.line}: ${problem.reason}`),
  });

  const records = parseCsv(input.replace(/^\ufeff/, ""));
  if (records.length === 0) return result();

  /* A header row names its own columns; it is not data. Without one the
     order is text, variety, category, as in the template. */
  const header = readHeader(records[0].cells);
  const index: Record<Column, number> = header ?? { text: 0, variety: 1, category: 2 };
  const body = header ? records.slice(1) : records;

  for (const { cells, line } of body) {
    if (cells.every((cell) => !cell.trim())) continue;

    const text = (cells[index.text] ?? "").trim();
    if (!text) {
      reject(line, "no text");
      continue;
    }

    const rawVariety = index.variety >= 0 ? cells[index.variety] : undefined;
    const variety = matchVariety(rawVariety);
    if (!variety) {
      reject(line, `"${rawVariety?.trim()}" is not English or Pidgin`);
      continue;
    }

    const category = index.category >= 0 ? (cells[index.category] ?? "").trim() : "";
    if (category.length > CATEGORY_MAX) {
      reject(line, `category is over ${CATEGORY_MAX} characters`);
      continue;
    }

    rows.push({ text, variety, category: category || undefined, line });
  }

  return result();
}

const TO_API_VARIETY: Record<Variety, ApiLanguageVariety> = {
  "Nigerian English": "nigerian_english",
  "Nigerian Pidgin": "nigerian_pidgin",
};

/**
 * The parsed rows, rewritten in the exact shape the import route takes.
 *
 * This is what gets uploaded, not the person's original file. The server
 * still validates each row and checks for duplicates against the bank,
 * which a client cannot see. It just no longer refuses the whole file over
 * a header name.
 */
export function bankRowsToCsv(rows: BankCsvRow[]): string {
  const cell = (value: string) =>
    /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  return [
    "text,language_variety,category",
    ...rows.map((row) =>
      [cell(row.text), TO_API_VARIETY[row.variety], cell(row.category ?? "")].join(",")
    ),
  ].join("\r\n");
}

function readHeader(cells: string[]): Record<Column, number> | null {
  const names = cells.map((cell) =>
    cell.trim().toLowerCase().replace(/[\s-]+/g, "_")
  );
  const find = (column: Column) =>
    names.findIndex((name) => HEADER_ALIASES[column].includes(name));

  const text = find("text");
  if (text < 0) return null;
  return { text, variety: find("variety"), category: find("category") };
}

/**
 * RFC 4180, near enough: quoted cells may hold commas, doubled quotes and
 * line breaks. A prompt that runs over two lines in a spreadsheet cell
 * comes through as one prompt, not two broken rows.
 */
function parseCsv(input: string): { cells: string[]; line: number }[] {
  const records: { cells: string[]; line: number }[] = [];
  let cells: string[] = [];
  let current = "";
  let quoted = false;
  let line = 1;
  let recordLine = 1;

  const endRecord = () => {
    cells.push(current);
    records.push({ cells, line: recordLine });
    cells = [];
    current = "";
  };

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (quoted) {
      if (char === '"') {
        // A doubled quote inside a quoted cell is a literal quote.
        if (input[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = false;
        }
        continue;
      }
      if (char === "\n") line += 1;
      current += char;
      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      cells.push(current);
      current = "";
      continue;
    }
    if (char === "\r" || char === "\n") {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      endRecord();
      line += 1;
      recordLine = line;
      continue;
    }
    current += char;
  }

  if (current !== "" || cells.length > 0) endRecord();

  return records.filter((record) => record.cells.some((cell) => cell.trim()));
}

/**
 * Blank falls back to Pidgin, as the dialog says. Anything else must say
 * English or Pidgin in some form. A guess on "Yoruba" would put a prompt in
 * the wrong bank without anyone noticing.
 */
function matchVariety(value: string | undefined): Variety | null {
  const needle = (value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (!needle) return "Nigerian Pidgin";

  const exact = VARIETIES.find((variety) => variety.toLowerCase() === needle);
  if (exact) return exact;
  if (/\b(english|en|ng en)\b/.test(needle)) return "Nigerian English";
  if (/\b(pidgin|pcm|naija)\b/.test(needle)) return "Nigerian Pidgin";
  return null;
}

/** The import route refuses a file over this many rows. */
export const BANK_IMPORT_MAX_ROWS = 5000;

export type BatchedImportResult = {
  added: number;
  skipped: number;
  failed: number;
  /** The first row the server refused, on its line in the person's file. */
  firstFailure?: { line: number; reason: string };
  batches: number;
  /** Batches that landed before one threw. Equal to `batches` on success. */
  sent: number;
};

/**
 * Sends a bank of any size, in files the import route will take.
 *
 * One batch at a time, in order. If one throws, the batches before it have
 * landed and the error carries how far it got. Re-running the whole file is
 * then safe: the server skips text it already has, so nothing is doubled.
 */
export async function importInBatches(
  rows: BankCsvRow[],
  send: (file: File) => Promise<{
    added: number;
    skipped: number;
    failed: number;
    failures?: { line: number; reason: string }[];
  }>,
  name = "bank.csv"
): Promise<BatchedImportResult> {
  const total: BatchedImportResult = {
    added: 0,
    skipped: 0,
    failed: 0,
    batches: Math.ceil(rows.length / BANK_IMPORT_MAX_ROWS),
    sent: 0,
  };

  for (let start = 0; start < rows.length; start += BANK_IMPORT_MAX_ROWS) {
    const batch = rows.slice(start, start + BANK_IMPORT_MAX_ROWS);
    let result;
    try {
      result = await send(new File([bankRowsToCsv(batch)], name, { type: "text/csv" }));
    } catch (cause) {
      throw new BatchImportError(total, cause);
    }

    total.added += result.added;
    total.skipped += result.skipped;
    total.failed += result.failed;
    total.sent += 1;

    /* The server numbers the file it was sent, header first. Its line 2 is
       this batch's first row, which carries the line it sat on in the
       person's own file. */
    const first = result.failures?.[0];
    if (first && !total.firstFailure) {
      total.firstFailure = {
        line: batch[first.line - 2]?.line ?? first.line,
        reason: first.reason,
      };
    }
  }

  return total;
}

export class BatchImportError extends Error {
  constructor(
    readonly progress: BatchedImportResult,
    readonly cause: unknown
  ) {
    super(`Import stopped after ${progress.sent} of ${progress.batches} batches`);
  }
}
