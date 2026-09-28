import AltArrowDown from "@solar-icons/react/arrows/AltArrowDown";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldBeam } from "@/components/shared/FieldBeam";
import { alvaSelectClass } from "@/lib/alva-form-styles";
import { cn } from "@/lib/utils";

export type MultiSelectOption = {
  value: string;
  label: string;
  /** Second line under the label, for options that need explaining. */
  detail?: string;
};

/**
 * Pick several from a list, in a trigger the same size and shape as
 * `AlvaSelect`.
 *
 * A column of checkboxes puts every option on screen at once and grows the
 * form by its length; this keeps the field one row tall and summarises the
 * choice ("4 selected"), which is what the reader wants back once they have
 * made it. Selection is shown by a tick on the row rather than a checkbox —
 * the whole row is the hit area, so a separate control to aim at is a smaller
 * target for the same result.
 */
export function AlvaMultiSelect({
  value,
  onChange,
  options,
  placeholder = "None selected",
  summary,
  className,
  "aria-label": ariaLabel,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  /** Overrides the default "N selected" label. */
  summary?: (selected: string[]) => string;
  className?: string;
  "aria-label"?: string;
}) {
  const toggle = (option: string) =>
    onChange(
      value.includes(option)
        ? value.filter((entry) => entry !== option)
        : [...value, option]
    );

  const label =
    value.length === 0
      ? placeholder
      : summary
        ? summary(value)
        : value.length === options.length
          ? "All areas"
          : `${value.length} selected`;

  return (
    <DropdownMenu>
      <FieldBeam className={className}>
        <DropdownMenuTrigger
          aria-label={ariaLabel}
          className={cn(
            alvaSelectClass(),
            "flex w-full items-center justify-between gap-2 px-3 text-sm",
            value.length === 0 && "text-muted-foreground"
          )}
        >
          <span className="truncate">{label}</span>
          <AltArrowDown size={15} weight="Outline" className="shrink-0 opacity-60" />
        </DropdownMenuTrigger>
      </FieldBeam>

      <DropdownMenuContent
        align="start"
        className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-2xl border-alva-border bg-alva-card p-1.5"
      >
        {options.map((option) => {
          const selected = value.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              role="checkbox"
              aria-checked={selected}
              aria-label={option.label}
              onClick={(event) => {
                // Keep the menu open: picking several is the whole point.
                event.preventDefault();
                toggle(option.value);
              }}
              className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
            >
              <CheckCircle
                size={16}
                weight={selected ? "Bold" : "Outline"}
                className={cn(
                  "mt-0.5 shrink-0",
                  selected ? "text-alva-accent" : "text-muted-foreground/50"
                )}
              />
              <span className="min-w-0">
                <span className="block text-sm text-foreground">{option.label}</span>
                {option.detail ? (
                  <span className="block text-xs text-muted-foreground">
                    {option.detail}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
