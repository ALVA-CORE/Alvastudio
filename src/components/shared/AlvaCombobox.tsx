import { useState } from "react";
import AltArrowDown from "@solar-icons/react/arrows/AltArrowDown";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
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
export function AlvaCombobox({
  value,
  onValueChange,
  options,
  placeholder = "Select",
  searchPlaceholder = "Search",
  emptyMessage = "Nothing found",
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    /* `modal` so it still works inside a sheet. Radix blanks pointer events
       outside the top dialog layer, and a non-modal popover rendered under one
       is visible but dead to the touch. */
    <Popover modal open={open} onOpenChange={setOpen}>
      {/* The beam stays lit while the list is open, not just while the trigger
          holds focus, so the field does not look abandoned mid-choice. */}
      <FieldBeam active={open || undefined} className={className}>
        <PopoverTrigger
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          className={cn(
            alvaSelectClass(),
            "flex w-full items-center justify-between gap-2 px-3 text-sm",
            !selected && "text-muted-foreground"
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
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
            className="h-11 border-0 text-sm placeholder:text-muted-foreground focus:ring-0"
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
                    className="gap-2.5 rounded-xl px-2.5 py-2 text-sm aria-selected:bg-alva-surface"
                  >
                    <CheckCircle
                      size={16}
                      weight={isSelected ? "Bold" : "Outline"}
                      className={cn(
                        "shrink-0",
                        isSelected ? "text-alva-accent" : "text-muted-foreground/40"
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
