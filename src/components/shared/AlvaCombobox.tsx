import { useState } from "react";
import AltArrowDown from "@solar-icons/react/arrows/AltArrowDown";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FieldBeam } from "@/components/shared/FieldBeam";
import { alvaSelectClass } from "@/lib/alva-form-styles";
import { cn } from "@/lib/utils";

export type ComboboxOption = { value: string; label: string };

/**
 * A select you can type into.
 *
 * Used where the list is long enough that scrolling it is worse than typing
 * three letters. Nigeria has a few dozen banks and nobody scrolls to find
 * theirs, they type "zen".
 *
 * Shaped like `AlvaSelect` on purpose, so a form can hold one of each without
 * looking like it was assembled from two different products.
 */
/**
 * The lifted label rides the field's top border, with nothing behind it.
 *
 * It used to carry a `bg-alva-surface` patch to hide the border line running
 * through the text. The patch was the problem: one surface sitting on
 * another, and a visible rectangle wherever the two did not match exactly.
 * Without it the text simply crosses the edge, which is the look this was
 * imitating in the first place.
 *
 * The field also no longer repads itself when the label lifts. The extra top
 * padding existed to drop the value clear of the label, and it nudged the
 * content down the moment somebody chose something. It was never needed: the label's
 * baseline sits above the field's text box at every size here.
 */
export function AlvaCombobox({
  value,
  onValueChange,
  options,
  placeholder = "Select",
  label,
  searchPlaceholder = "Search",
  emptyMessage = "Nothing found",
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  /** Floats to the top edge once chosen, the same way `AlvaSelect` does it. */
  label?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const lifted = open || Boolean(selected);

  const field = (
    /* `modal` so it still works inside a sheet. Radix blanks pointer events
       outside the top dialog layer, and a non-modal popover rendered under one
       is visible but dead to the touch. */
    <Popover modal open={open} onOpenChange={setOpen}>
      {/* The beam stays lit while the list is open, not just while the trigger
          holds focus, so the field does not look abandoned mid-choice. */}
      <FieldBeam
        active={open || undefined}
        className={label ? undefined : className}
      >
        <PopoverTrigger
          role="combobox"
          aria-label={ariaLabel ?? label}
          aria-expanded={open}
          className={cn(
            alvaSelectClass(),
            "flex w-full items-center justify-between gap-2 px-3 text-sm",
            !selected && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {selected?.label ?? (label ? "" : placeholder)}
          </span>
          <AltArrowDown size={15} weight="Outline" className="shrink-0 opacity-60" />
        </PopoverTrigger>
      </FieldBeam>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] rounded-2xl border-alva-border bg-alva-card p-0"
      >
        <Command className="bg-transparent">
          <CommandInput
            placeholder={searchPlaceholder}
            className="h-11 border-0 text-xs placeholder:text-xs placeholder:text-muted-foreground focus:ring-0 sm:text-sm sm:placeholder:text-sm"
          />
          <CommandList className="max-h-60">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </CommandEmpty>
            <CommandGroup className="p-1.5">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onValueChange(option.value);
                      setOpen(false);
                    }}
                    className="rounded-xl px-2.5 py-2 text-sm aria-selected:bg-alva-surface"
                  >
                    {/* No tick. The list is a search result, and a column of
                        empty circles down the side of it reads as a set of
                        checkboxes you are meant to fill in. The chosen one is
                        marked by colour. */}
                    <span
                      className={cn(
                        "truncate",
                        isSelected && "font-medium text-alva-accent"
                      )}
                    >
                      {option.label}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  if (!label) return field;

  return (
    <div className={cn("relative overflow-visible pt-2", className)}>
      <span
        className={cn(
          "pointer-events-none absolute z-20 max-w-[calc(100%-3.5rem)] truncate transition-all duration-200 ease-out",
          lifted
            ? "left-4 top-2 -translate-y-1/2 text-[11px] font-medium leading-none text-alva-accent"
            : "left-3 top-[calc(0.5rem+20px)] -translate-y-1/2 text-sm text-muted-foreground"
        )}
      >
        {label}
      </span>

      {field}
    </div>
  );
}
