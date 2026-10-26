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


/** Headline counts for the bank page, read off the rows it already has. */
export function bankMetrics(rows: BankItem[]) {
  const active = rows.filter((row) => row.isActive);
  return {
    total: String(rows.length),
    active: String(active.length),
    unused: String(active.filter((row) => row.usedByCount === 0).length),
    recordings: String(
      rows.reduce((sum, row) => sum + row.usedByCount, 0).toLocaleString()
    ),
  };
}

export const EMPTY_BANK_METRICS = {
  total: "0",
  active: "0",
  unused: "0",
  recordings: "0",
};
