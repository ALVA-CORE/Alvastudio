import { CardBackdrop } from "@/components/contributors/wallet/CardBackdrop";
import { Money } from "@/components/contributors/wallet/Money";
import { cn } from "@/lib/utils";

/** Card proportions, same as the plastic in anyone's pocket. */
const ASPECT = "aspect-[320/201]";

export type CardTone = "available" | "held" | "sending" | "paid";

/**
 * One colour per bucket, carried from the status palette the rest of the
 * product uses: accent is money you can have now, amber is money waiting on
 * something, blue is money that has already gone.
 */
const TONE: Record<CardTone, { bg: string; hex: string }> = {
  available: { bg: "bg-alva-accent", hex: "#25F07D" },
  held: { bg: "bg-[hsl(38_92%_62%)]", hex: "#F5B544" },
  sending: { bg: "bg-[hsl(199_80%_66%)]", hex: "#60C6F0" },
  paid: { bg: "bg-[hsl(262_60%_72%)]", hex: "#A98AE0" },
};

/**
 * One card in the wallet.
 *
 * Label, amount, mark. Nothing else: the bank details moved off the card and
 * onto the Payout button, because a card that opens a form when you touch it
 * cannot also be a thing you shuffle.
 */
export function WalletCard({
  label,
  caption,
  kobo,
  tone,
  /** Only the card in front carries the live field. See the note in the stack. */
  field = false,
  className,
}: {
  label: string;
  caption?: string;
  kobo: number;
  tone: CardTone;
  field?: boolean;
  className?: string;
}) {
  const palette = TONE[tone];

  return (
    <div
      className={cn(
        ASPECT,
        "relative w-full overflow-hidden rounded-2xl p-4 text-left",
        palette.bg,
        "shadow-[0_10px_24px_-6px_rgba(0,0,0,0.65),0_2px_6px_rgba(0,0,0,0.4)]",
        className
      )}
    >
      {field ? (
        <CardBackdrop background={palette.hex} className="absolute inset-0" />
      ) : null}

      <span className="relative z-[1] flex h-full flex-col text-alva-bg">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-xs text-alva-bg/70">{label}</span>
            <Money
              kobo={kobo}
              className="mt-1 block truncate text-2xl font-semibold tracking-tight"
            />
          </span>

          {/* The mark sits where a scheme logo would, bare. A disc behind it
              read as a sticker stuck on the card. */}
          <img
            src="/assets/logos/favicon.svg"
            alt=""
            aria-hidden
            className="size-8 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
          />
        </span>

        {caption ? (
          <span className="mt-auto block text-[11px] text-alva-bg/70">
            {caption}
          </span>
        ) : null}
      </span>
    </div>
  );
}
