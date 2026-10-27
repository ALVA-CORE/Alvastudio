import { useState } from "react";
import AltArrowDown from "@solar-icons/react/arrows/AltArrowDown";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import { NIGERIAN_STATES } from "@/data/interns/participants";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FloatingFieldLabel } from "@/components/shared/FloatingFieldLabel";
import { alvaSelectClass } from "@/lib/alva-form-styles";
import { cn } from "@/lib/utils";

type StateComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  size?: "md" | "lg";
  className?: string;
  /**
   * The floating label, in place of one stacked above the field.
   *
   * Pass this *or* a label above, never both: the sign-up forms were asking
   * the same question twice, once in grey above the box and once inside it.
   */
  label?: string;
};

export function StateCombobox({
  value,
  onChange,
  placeholder = "Select state",
  error,
  size = "md",
  className,
  label,
}: StateComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <FloatingFieldLabel
      label={label}
      lifted={open || Boolean(value)}
      size={size}
      className={className}
    >
    <div className={label ? undefined : className}>
      <Popover modal open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={label}
            className={cn(
              "w-full justify-between rounded-xl border border-transparent bg-alva-surface font-normal text-foreground hover:bg-alva-surface hover:text-foreground focus-visible:border-alva-border",
              size === "lg" ? "h-12" : "h-10",
              !value && "text-muted-foreground",
              alvaSelectClass(Boolean(error), size)
            )}
          >
            {/* While the floating label is down it IS the placeholder. */}
            {value || (label ? "" : placeholder)}
            <AltArrowDown size={16} weight="Outline" className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="z-[200] w-[var(--radix-popover-trigger-width)] border-alva-border bg-alva-card p-0"
          style={{ zIndex: 200 }}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Command className="bg-alva-card">
            <CommandInput placeholder="Search states..." className="h-10" />
            <CommandList>
              <CommandEmpty>No state found.</CommandEmpty>
              <CommandGroup>
                {NIGERIAN_STATES.map((state) => (
                  <CommandItem
                    key={state}
                    value={state}
                    onMouseDown={(event) => event.preventDefault()}
                    onSelect={(selected) => {
                      const match =
                        NIGERIAN_STATES.find(
                          (entry) => entry.toLowerCase() === selected.toLowerCase()
                        ) ?? selected;
                      onChange(match);
                      setOpen(false);
                    }}
                    className="cursor-pointer text-foreground aria-selected:bg-alva-surface"
                  >
                    <CheckCircle
                      size={16}
                      weight="Bold"
                      className={cn("mr-2", value === state ? "opacity-100" : "opacity-0")}
                    />
                    {state}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
    </FloatingFieldLabel>
  );
}
