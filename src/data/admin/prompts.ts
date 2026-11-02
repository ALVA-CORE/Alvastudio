import { type Variety } from "./shared";

export type BankKind = "prompt" | "stimulus" | "topic";

/**
 * What a bank item is.
 *
 * Three kinds and three endpoints. The old list — "Everyday life", "Work and
 * money" and so on — was a topic taxonomy nobody had agreed, so it is gone.
 *
 * It is **derived, not chosen**: an item's kind is decided by which bank it
 * was written to. Offering it as a field let somebody set "Stimuli" on a
 * prompt and then wonder why it stayed in the Prompts tab, and changing it for
 * real means deleting from one bank and creating in the other, which loses the
 * id every recording points at.
 */
export type BankCategory = BankKind;

export const BANK_CATEGORY_LABELS: Record<BankCategory, string> = {
  prompt: "Prompt",
  stimulus: "Stimuli",
  topic: "Focus group topic",
};

/**
 * What an item is, from what the API gave us.
 *
 * `category` is free text server side, so most rows carry something that is
 * not one of ours — the whole seeded bank is tagged `placeholder`. Those are
 * read as whatever bank they came from rather than shown raw, because
 * "placeholder" is not a category, it is a note to whoever seeded it.
 */
/**
 * What an item is: the bank it came out of.
 *
 * `category` is free text server side and most rows carry something that is
 * not a category at all — the seeded bank is tagged `placeholder`. The three
 * banks are the taxonomy, so the kind is the answer.
 */
export function bankCategory(item: { kind: BankKind }): BankCategory {
  return item.kind;
}

export type BankItem = {
  id: string;
  kind: BankKind;
  text: string;
  variety: Variety;
  /** Free text, straight from the API. Read it through `bankCategory`. */
  category: string;
  isActive: boolean;
  /** How many recordings exist against it. Zero means nobody has taken it up. */
  usedByCount: number;
  createdAt: number;
  createdLabel: string;
  /** Topics only: how many people a session on this topic should have. */
  targetParticipants?: number;
};


/**
 * The headline numbers for one bank.
 *
 * From the server for prompts and stimuli, never from the rows on screen:
 * the bank is thousands deep and a page of it is newest first, so a count
 * taken off a page reads zero recorded while the recorded ones sit on page
 * fifty. `null` means the API did not say, which is shown as a dash rather
 * than as a confident zero.
 */
export type BankTotals = {
  /** Every item, active or retired. */
  bank: number;
  active: number;
  /** Recorded at least once, even if the recording was later rejected. */
  recorded: number | null;
  /** Active and never recorded: the ones contributors are not reaching. */
  neverRecorded: number | null;
};

export const EMPTY_BANK_TOTALS: BankTotals = {
  bank: 0,
  active: 0,
  recorded: 0,
  neverRecorded: 0,
};

/** Topics only. Their bank is small enough to hold whole and count here. */
export function bankTotalsFromRows(rows: BankItem[]): BankTotals {
  const active = rows.filter((row) => row.isActive);
  return {
    bank: rows.length,
    active: active.length,
    recorded: rows.filter((row) => row.usedByCount > 0).length,
    neverRecorded: active.filter((row) => row.usedByCount === 0).length,
  };
}
