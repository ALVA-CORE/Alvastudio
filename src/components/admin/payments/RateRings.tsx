import { useState } from "react";
import { RingChart } from "@/components/charts/ring-chart";
import { Ring } from "@/components/charts/ring";
import { RingCenter } from "@/components/charts/ring-center";
import { Input } from "@/components/ui/input";
import { TextureButton } from "@/components/ui/texture-button";
import { RATE_UNIT_LABELS, formatNaira, type Rate } from "@/data/admin/payments";
import { cn } from "@/lib/utils";

/**
 * Five rings, longest arc for the best-paid unit.
 *
 * A rate card answers one question: is annotation paid fairly against
 * recording. A column of currency strings makes the reader do that comparison
 * in their head, and a row of bars answers it but takes the full width of the
 * card to say five numbers. Concentric rings put all five against the same
 * scale in one shape, with room beside them for the figures and the edit.
 *
 * The highest rate sets the full circle, so the rings are relative to each
 * other rather than to a budget nobody has set.
 */
const PALETTE = [
  "hsl(146 87% 54%)",
  "hsl(199 89% 58%)",
  "hsl(262 72% 68%)",
  "hsl(38 92% 58%)",
  "hsl(330 68% 66%)",
];

export function RateRings({
  rates,
  onSave,
}: {
  rates: Rate[];
  onSave: (rate: Rate, naira: string) => void;
}) {
  const [editing, setEditing] = useState<Rate["unit"] | null>(null);
  const [draft, setDraft] = useState("");

  const max = Math.max(...rates.map((rate) => rate.amountKobo), 1);

  const data = rates.map((rate, index) => ({
    label: RATE_UNIT_LABELS[rate.unit],
    value: Math.round(rate.amountKobo / 100),
    maxValue: Math.round(max / 100),
    color: PALETTE[index % PALETTE.length],
  }));

  const start = (rate: Rate) => {
    setEditing(rate.unit);
    setDraft(String(Math.round(rate.amountKobo / 100)));
  };

  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
      <div className="flex items-center justify-center">
        <RingChart
          data={data}
          strokeWidth={13}
          ringGap={6}
          baseInnerRadius={34}
        >
          {rates.map((_, index) => (
            <Ring key={index} index={index} showGlow={index === 0} />
          ))}
          {/* Hovering a ring swaps the centre to that rate; at rest it is the
              best-paid one, which is the number people come here to check. */}
          <RingCenter
            defaultLabel="top rate"
            prefix="₦"
            valueClassName="text-foreground"
            labelClassName="text-[10px] text-muted-foreground"
          />
        </RingChart>
      </div>

      <ul className="alva-thin-scrollbar max-h-[15rem] space-y-1 self-center overflow-y-auto pr-1">
        {rates.map((rate, index) => {
          const isEditing = editing === rate.unit;

          return (
            <li
              key={rate.unit}
              className="flex items-center justify-between gap-3 border-b border-alva-border/50 py-2 last:border-0"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
                />
                <span className="min-w-0 truncate text-sm text-foreground">
                  {RATE_UNIT_LABELS[rate.unit]}
                </span>
              </span>

              {isEditing ? (
                <span className="flex shrink-0 items-center gap-2">
                  <Input
                    autoFocus
                    inputMode="decimal"
                    aria-label={`${RATE_UNIT_LABELS[rate.unit]} rate in naira`}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        onSave(rate, draft);
                        setEditing(null);
                      }
                      if (event.key === "Escape") setEditing(null);
                    }}
                    wrapperClassName="w-24"
                    className="h-9 text-right tabular-nums"
                  />
                  <TextureButton
                    variant="alva"
                    size="sm"
                    className="w-auto"
                    onClick={() => {
                      onSave(rate, draft);
                      setEditing(null);
                    }}
                  >
                    Save
                  </TextureButton>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => start(rate)}
                  title={`Updated ${rate.updatedLabel} by ${rate.updatedBy}`}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-sm tabular-nums text-foreground transition-colors",
                    "hover:bg-alva-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
                  )}
                >
                  {formatNaira(rate.amountKobo)}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
