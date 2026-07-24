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
import { alvaSelectClass } from "@/lib/alva-form-styles";
import { cn } from "@/lib/utils";

type StateComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
};

export function StateCombobox({
  value,
  onChange,
  placeholder = "Select state",
  error,
  className,
}: StateComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <Popover modal open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-10 w-full justify-between rounded-full border-0 bg-alva-surface font-normal text-foreground hover:bg-alva-surface hover:text-foreground",
              !value && "text-muted-foreground",
              alvaSelectClass(Boolean(error))
            )}
          >
            {value || placeholder}
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
  );
}
