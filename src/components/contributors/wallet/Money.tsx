import { cn } from "@/lib/utils";

/**
 * An amount of money, with the currency mark set smaller than the figure.
 *
 * At the same size the ₦ competes with the first digit and the eye reads the
 * mark before the number; a step down lets the figure lead and leaves the mark
 * as the label it is. The step is in `em`, so this works at any text size it
 * is dropped into.
 *
 * Always two decimals. The wallet is denominated in kobo and a balance that
 * rounds them away cannot be reconciled against the ledger below it.
 */
export function Money({
  kobo,
  /** Shows a `+` on money in. Money out always carries its minus. */
  signed = false,
  className,
}: {
  kobo: number;
  signed?: boolean;
  className?: string;
}) {
  const sign = kobo < 0 ? "−" : signed ? "+" : "";
  const amount = (Math.abs(kobo) / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span className={cn("tabular-nums", className)}>
      {sign}
      <span className="text-[0.76em] font-normal">₦</span>
      {amount}
    </span>
  );
}
