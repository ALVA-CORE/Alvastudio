import { BANK_CATEGORIES, type BankCategory } from "@/data/admin/prompts";
import { VARIETIES, type Variety } from "@/data/admin/shared";
import type { BankDraft } from "@/components/admin/prompts/BankItemForm";

export const BANK_CSV_TEMPLATE = [
  "text,variety,category",
  '"Tell us about a market day you still remember.",Nigerian English,Everyday life',
  '"Wetin you go tell person wey just land Naija?",Nigerian Pidgin,Travel and transport',
].join("\n");

export type BankCsvResult = {
  rows: BankDraft[];
  /** One readable line per rejected row, for the preview. */
  skipped: string[];
};

/**
 * Parses a pasted or uploaded prompt bank.
 *
 * Deliberately forgiving about everything except the text. A linguist's export
 * will have smart quotes, a header row or not, and a variety written as
 * "pidgin" rather than "Nigerian Pidgin" — none of those are worth refusing a
 * file over. A row with no text is the only thing that cannot be salvaged, and
 * it is reported rather than dropped silently.
 */
export function parseBankCsv(input: string): BankCsvResult {
  const rows: BankDraft[] = [];
  const skipped: string[] = [];

  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const [index, line] of lines.entries()) {
    const cells = splitCsvLine(line);
    const text = cells[0]?.trim() ?? "";

    // A header row names its own columns; it is not data.
    if (index === 0 && /^text$/i.test(text)) continue;

    if (!text) {
      skipped.push(`line ${index + 1}: no text`);
      continue;
    }

    rows.push({
      text,
      variety: matchVariety(cells[1]),
      category: matchCategory(cells[2]),
    });
  }

  return { rows, skipped };
}

/** Handles quoted cells containing commas, which prompts routinely do. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      // A doubled quote inside a quoted cell is a literal quote.
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
        continue;
      }
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function matchVariety(value: string | undefined): Variety {
  const needle = (value ?? "").trim().toLowerCase();
  if (!needle) return "Nigerian Pidgin";
  return (
    VARIETIES.find((variety) => variety.toLowerCase() === needle) ??
    (needle.includes("english") ? "Nigerian English" : "Nigerian Pidgin")
  );
}

function matchCategory(value: string | undefined): BankCategory {
  const needle = (value ?? "").trim().toLowerCase();
  if (!needle) return "Everyday life";
  return (
    BANK_CATEGORIES.find((category) => category.toLowerCase() === needle) ??
    "Everyday life"
  );
}
