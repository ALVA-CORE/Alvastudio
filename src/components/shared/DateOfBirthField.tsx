import { useEffect, useMemo, useState } from "react";
import { AlvaSelect } from "@/components/shared/AlvaSelect";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Days in a month, leap years included — so 29 February is reachable. */
function daysIn(year: number, month: number): number {
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

type DateParts = { year: string; month: string; day: string };

const EMPTY: DateParts = { year: "", month: "", day: "" };

function split(value: string): DateParts {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return EMPTY;
  const [year, month, day] = value.split("-");
  return { year, month, day };
}

/** `""` until all three are answered — a partial date is not a date. */
function join({ year, month, day }: DateParts): string {
  return year && month && day ? `${year}-${month}-${day}` : "";
}

/**
 * A date of birth, as three dropdowns.
 *
 * **Not a calendar.** A calendar is the right control for a date near today
 * — a booking, a deadline — and the wrong one for a birthday thirty years
 * back, where it means paging a grid three hundred and sixty times. The
 * dropdown layout is one tap per field and lands anywhere in a century.
 *
 * It is also the only arrangement that works on a phone without a custom
 * popover: a native `<input type="date">` drew its own `dd/mm/yyyy`
 * underneath our floating label, which is two pieces of text in one box.
 *
 * The year list is bounded by the API's own rule — eighteen and over, a
 * hundred and twenty at most — so an invalid age cannot be chosen rather
 * than being chosen and refused. The day list narrows to the month, so
 * 31 April is not offered either.
 *
 * Value is `YYYY-MM-DD`, or `""` until all three are answered, which is what
 * `POST /wallet/identity/documents` wants and what makes "is it complete?" a
 * length check rather than a parse.
 */
export function DateOfBirthField({
  value,
  onChange,
  minAge,
  maxAge,
}: {
  /** `YYYY-MM-DD`, or empty. */
  value: string;
  onChange: (next: string) => void;
  minAge: number;
  maxAge: number;
}) {
  /**
   * The three answers are held here, not derived from `value`.
   *
   * `value` is only a whole date — it is `""` until all three are chosen,
   * because that is what the API wants and what makes "is it complete?" a
   * length check. Reading the parts back out of it means the first two picks
   * have nowhere to live, so each one wipes the last and the field can never
   * be filled. It could not be filled, which is exactly what happened.
   */
  const [parts, setParts] = useState(() => split(value));

  /* A caller resetting the field (a closed sheet, a cleared form) has to
     clear the dropdowns too. Only on a real change, so typing here does not
     fight itself. */
  useEffect(() => {
    setParts((current) => (join(current) === value ? current : split(value)));
  }, [value]);

  const { year, month, day } = parts;

  const years = useMemo(() => {
    const latest = new Date().getFullYear() - minAge;
    const earliest = new Date().getFullYear() - maxAge;
    return Array.from({ length: latest - earliest + 1 }, (_, index) => {
      const y = latest - index;
      return { value: String(y), label: String(y) };
    });
  }, [minAge, maxAge]);

  const days = useMemo(() => {
    const count = daysIn(Number(year), Number(month));
    return Array.from({ length: count }, (_, index) => ({
      value: pad(index + 1),
      label: String(index + 1),
    }));
  }, [year, month]);

  const emit = (next: Partial<DateParts>) => {
    const merged = { ...parts, ...next };

    /* Picking February after choosing the 31st would otherwise leave an
       impossible date sitting in the field, submitted and refused. Clamped
       to the last real day of the new month instead. */
    const limit = daysIn(Number(merged.year), Number(merged.month));
    if (merged.day && Number(merged.day) > limit) merged.day = pad(limit);

    setParts(merged);
    onChange(join(merged));
  };

  return (
    <div className="grid grid-cols-[1fr_1.4fr_1fr] gap-2">
      <AlvaSelect
        aria-label="Day of birth"
        label="Day"
        value={day}
        options={days}
        onValueChange={(next) => emit({ day: next })}
        size="lg"
      />
      <AlvaSelect
        aria-label="Month of birth"
        label="Month"
        value={month}
        options={MONTHS.map((name, index) => ({
          value: pad(index + 1),
          label: name,
        }))}
        onValueChange={(next) => emit({ month: next })}
        size="lg"
      />
      <AlvaSelect
        aria-label="Year of birth"
        label="Year"
        value={year}
        options={years}
        onValueChange={(next) => emit({ year: next })}
        size="lg"
      />
    </div>
  );
}
