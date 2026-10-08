/**
 * Brand colour per Nigerian bank, for the payout card.
 *
 * The card takes the bank's own colour, so a contributor recognises their
 * account before reading a digit of it — the same way they recognise the
 * plastic in their pocket. First matching rule wins, so put the specific
 * patterns above the loose ones.
 *
 * Ported from the sellawise wallet, which already solved this.
 */

export type BankBrand = {
  /** Card background. */
  color: string;
  /** Text and detail colour that survives on it. */
  ink: "light" | "dark";
};

const RULES: Array<{ pattern: RegExp; brand: BankBrand }> = [
  { pattern: /guaranty\s*trust|gtbank|^gtb\b/i, brand: { color: "#D4782C", ink: "light" } },
  { pattern: /access\s*bank|^access\b/i, brand: { color: "#FF6600", ink: "light" } },
  { pattern: /zenith/i, brand: { color: "#E2231A", ink: "light" } },
  { pattern: /united\s*bank\s*for\s*africa|^uba\b/i, brand: { color: "#A02933", ink: "light" } },
  { pattern: /first\s*bank|^fbn\b|firstbank/i, brand: { color: "#002F6C", ink: "light" } },
  { pattern: /fidelity/i, brand: { color: "#822980", ink: "light" } },
  { pattern: /stanbic/i, brand: { color: "#0069B4", ink: "light" } },
  { pattern: /union\s*bank/i, brand: { color: "#2F6F4F", ink: "light" } },
  { pattern: /wema|^alat\b/i, brand: { color: "#5B2D90", ink: "light" } },
  { pattern: /polaris/i, brand: { color: "#7B0046", ink: "light" } },
  { pattern: /ecobank/i, brand: { color: "#006B3F", ink: "light" } },
  { pattern: /keystone/i, brand: { color: "#003B7A", ink: "light" } },
  { pattern: /providus/i, brand: { color: "#5C2D91", ink: "light" } },
  { pattern: /kuda/i, brand: { color: "#40196D", ink: "light" } },
  { pattern: /opay/i, brand: { color: "#00B876", ink: "dark" } },
  { pattern: /moniepoint/i, brand: { color: "#182F4C", ink: "light" } },
  { pattern: /palm\s*pay|palmpay/i, brand: { color: "#6700BC", ink: "light" } },
  { pattern: /sterling/i, brand: { color: "#DB3A2F", ink: "light" } },
  { pattern: /^fcmb\b|first\s*city/i, brand: { color: "#6A2C8F", ink: "light" } },
];

/** A bank we have no colour for still gets a card, not a hole. */
const GENERIC: BankBrand = { color: "#3A3A52", ink: "light" };

export function bankBrand(bankName: string): BankBrand {
  const trimmed = bankName.trim();
  if (!trimmed) return GENERIC;
  return RULES.find((rule) => rule.pattern.test(trimmed))?.brand ?? GENERIC;
}

/** The banks the picker offers. Replace with `GET /banks` when it exists. */
export const NIGERIAN_BANKS = [
  "Access Bank",
  "Ecobank",
  "Fidelity Bank",
  "First Bank of Nigeria",
  "First City Monument Bank",
  "Guaranty Trust Bank",
  "Keystone Bank",
  "Kuda",
  "Moniepoint",
  "OPay",
  "PalmPay",
  "Polaris Bank",
  "Providus Bank",
  "Stanbic IBTC",
  "Sterling Bank",
  "Union Bank",
  "United Bank for Africa",
  "Wema Bank",
  "Zenith Bank",
] as const;
