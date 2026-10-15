import { VARIETIES, daysAgo, pick, relativeDays, seeded, type Variety } from "./shared";

export type BankKind = "prompt" | "stimulus";

/**
 * What a bank item is.
 *
 * Three kinds, and nothing else. The old list — "Everyday life", "Work and
 * money" and so on — was a topic taxonomy nobody had agreed, so it is gone.
 *
 * It is **derived, not chosen**. Prompts and stimuli are separate endpoints,
 * so an item's kind is decided by which one it was written to; offering it as
 * a field let somebody set "Stimuli" on a prompt and then wonder why it stayed
 * in the Prompts tab. Changing it would mean deleting from one bank and
 * creating in the other, which loses the id every recording points at.
 *
 * Focus group topics have no endpoint at all, so they live in the prompts bank
 * under this category until one exists. See docs/endpoints-needed.md §10.
 */
export type BankCategory = "prompt" | "stimulus" | "focus_group_topic";

export const BANK_CATEGORIES: BankCategory[] = [
  "prompt",
  "stimulus",
  "focus_group_topic",
];

export const BANK_CATEGORY_LABELS: Record<BankCategory, string> = {
  prompt: "Prompt",
  stimulus: "Stimuli",
  focus_group_topic: "Focus group topic",
};

/**
 * What an item is, from what the API gave us.
 *
 * `category` is free text server side, so most rows carry something that is
 * not one of ours — the whole seeded bank is tagged `placeholder`. Those are
 * read as whatever bank they came from rather than shown raw, because
 * "placeholder" is not a category, it is a note to whoever seeded it.
 */
export function bankCategory(item: {
  kind: BankKind;
  category: string;
}): BankCategory {
  if (item.category === "focus_group_topic") return "focus_group_topic";
  return item.kind === "stimulus" ? "stimulus" : "prompt";
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
};

const PROMPT_TEXTS = [
  "The traffic for Lagos island go always choke by seven a.m., especially when rain fall.",
  "Tell us about a market day you still remember, and what made it different.",
  "Describe the last time you helped a stranger find their way.",
  "Wetin you go tell person wey just land Naija for the first time?",
  "Talk about a meal your family makes that nobody else gets right.",
  "Explain how you get to work, from the moment you leave your door.",
  "Describe a time the light went off at the worst possible moment.",
  "Which Nigerian musician do you think will still be played in twenty years?",
  "Tell us about the busiest day you have had this month.",
  "How do you decide which bus or keke to take when you are in a hurry?",
  "Talk about something that has got cheaper, and something that has got dearer.",
  "Describe your street to someone who has never seen it.",
  "Wetin be the one advice wey your mama give you wey you still dey follow?",
  "Explain a game you played as a child, and how you won it.",
  "Tell us about a wedding you went to and what stood out.",
];

const STIMULUS_TEXTS = [
  "A photograph of a crowded Lagos danfo park at rush hour.",
  "A short clip of rain on a zinc roof.",
  "An image of jollof rice being served at a party.",
  "A photograph of a tailor's shop with fabric stacked to the ceiling.",
  "A picture of children playing football on a sandy pitch.",
  "A clip of a market trader calling out prices.",
  "A photograph of a motorcycle loaded far past sense.",
  "An image of an empty classroom at the end of term.",
  "A picture of a family sharing a meal on a Sunday.",
];

function buildBank(): BankItem[] {
  const random = seeded(4242);

  const make = (text: string, kind: BankKind, index: number): BankItem => {
    const created = daysAgo(Math.floor(random() * 180) + 1);
    return {
      id: `${kind === "prompt" ? "p" : "s"}-${String(index + 1).padStart(3, "0")}`,
      kind,
      text,
      variety: pick(random, VARIETIES),
      category: kind === "prompt" ? "prompt" : "stimulus",
      // A few retired items, so the active filter is worth having.
      isActive: random() > 0.15,
      // Roughly a fifth have never been recorded — the thing to spot.
      usedByCount: random() > 0.2 ? Math.floor(random() * 48) : 0,
      createdAt: created.getTime(),
      createdLabel: relativeDays(created),
    };
  };

  return [
    ...PROMPT_TEXTS.map((text, index) => make(text, "prompt", index)),
    ...STIMULUS_TEXTS.map((text, index) => make(text, "stimulus", index)),
  ].sort((a, b) => b.createdAt - a.createdAt);
}

export const BANK_ITEMS: BankItem[] = buildBank();

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
