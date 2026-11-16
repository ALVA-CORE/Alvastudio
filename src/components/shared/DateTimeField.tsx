import { useState } from "react";
import CalendarIcon from "@solar-icons/react/time/Calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlvaSelect } from "@/components/shared/AlvaSelect";
import { cn } from "@/lib/utils";

const pad = (value: number) => String(value).padStart(2, "0");

/** "2026-11-20T18:30" (a `datetime-local` value) and back. */
const toValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;

const HOURS = Array.from({ length: 24 }, (_, hour) => ({ value: pad(hour), label: pad(hour) }));
const MINUTES = ["00", "15", "30", "45"];

/**
 * A date and time, picked from shadcn's calendar and two of our selects, in
 * place of the browser's raw `datetime-local`. The value stays in that
 * format, so callers need not change. Empty is "not set".
 */
export function DateTimeField({
  label,
  value,
  onChange,
  fromDate,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Days before this cannot be picked. */
  fromDate?: Date;
}) {
  const [open, setOpen] = useState(false);
  const chosen = value ? new Date(value) : null;
  const shown = chosen && !Number.isNaN(chosen.getTime()) ? chosen : null;

  /* A day picked first gets the end of the working day. */
  const at = (day: Date, hour = shown?.getHours() ?? 18, minute = shown?.getMinutes() ?? 0) => {
    const next = new Date(day);
    next.setHours(hour, minute, 0, 0);
    onChange(toValue(next));
  };

  const minutes = shown && !MINUTES.includes(pad(shown.getMinutes())) ? [...MINUTES, pad(shown.getMinutes())] : MINUTES;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="relative flex h-12 w-full items-center gap-2 rounded-xl bg-alva-surface px-5 text-left text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
        >
          <span className={cn("flex-1 truncate", shown ? "text-foreground" : "text-muted-foreground")}>
            {shown
              ? shown.toLocaleString(undefined, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : label}
          </span>
          {shown ? <span className="text-xs text-muted-foreground">{label}</span> : null}
          <CalendarIcon size={16} weight="Outline" className="shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto rounded-2xl border-alva-border bg-alva-card p-3">
        <Calendar
          mode="single"
          selected={shown ?? undefined}
          defaultMonth={shown ?? undefined}
          disabled={fromDate ? { before: fromDate } : undefined}
          onSelect={(day) => day && at(day)}
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <AlvaSelect
            aria-label="Hour"
            value={shown ? pad(shown.getHours()) : undefined}
            placeholder="Hour"
            options={HOURS}
            onValueChange={(hour) => at(shown ?? new Date(), Number(hour))}
          />
          <AlvaSelect
            aria-label="Minute"
            value={shown ? pad(shown.getMinutes()) : undefined}
            placeholder="Minute"
            options={minutes.map((minute) => ({ value: minute, label: minute }))}
            onValueChange={(minute) => at(shown ?? new Date(), undefined, Number(minute))}
          />
        </div>
        {shown ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="mt-2 w-full rounded-full py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
