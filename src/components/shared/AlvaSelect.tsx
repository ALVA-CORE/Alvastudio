import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { alvaSelectClass } from "@/lib/alva-form-styles";
import { useState } from "react";
import { FieldBeam } from "@/components/shared/FieldBeam";
import { cn } from "@/lib/utils";

type AlvaSelectOption = {
  value: string;
  label: string;
};

type AlvaSelectProps = {
  /** Forwarded to the trigger — a select with no visible <label> needs one. */
  "aria-label"?: string;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /**
   * Floats to the top edge once something is chosen, the same way `BeamInput`
   * does it.
   *
   * Without it the question only exists as placeholder text, so answering it
   * erases it: a column of filled selects becomes a list of answers with
   * nothing saying what was asked. Pass this wherever the field sits in a form
   * the reader will scroll back through.
   */
  label?: string;
  options: AlvaSelectOption[];
  hasError?: boolean;
  size?: "md" | "lg";
  className?: string;
};

export function AlvaSelect({
  "aria-label": ariaLabel,
  value,
  onValueChange,
  placeholder,
  label,
  options,
  hasError,
  size = "md",
  className,
}: AlvaSelectProps) {
  const [open, setOpen] = useState(false);

  /* Lifted while the menu is open as well as when something is chosen, so the
     label gets out of the way of the list rather than sitting under it. */
  const lifted = open || Boolean(value);

  const trigger = (
    <Select value={value} onValueChange={onValueChange} open={open} onOpenChange={setOpen}>
      {/* The beam is held open while the menu is, not just while the trigger
          has focus — a select whose affordance vanishes the moment you open it
          looks like it lost focus. */}
      <FieldBeam active={open || undefined} className={label ? undefined : className}>
        <SelectTrigger
          aria-label={ariaLabel ?? label}
          className={cn(
            alvaSelectClass(hasError, size),
            "w-full",
            /* Room for the label on the top edge, and the value sits low so
               the two do not collide. */
            label && lifted && "pb-1.5 pt-5 [&>span]:leading-none"
          )}
        >
          <SelectValue placeholder={label ? "" : placeholder} />
        </SelectTrigger>
      </FieldBeam>
      <SelectContent className="rounded-2xl border-alva-border bg-alva-card">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (!label) return trigger;

  return (
    <div className={cn("relative overflow-visible pt-2", className)}>
      <span
        className={cn(
          "pointer-events-none absolute z-20 max-w-[calc(100%-3.5rem)] truncate transition-all duration-200 ease-out",
          lifted
            ? "left-4 top-2 -translate-y-1/2 bg-alva-surface px-1.5 text-[11px] font-medium leading-none text-alva-accent"
            : cn(
                "left-4 -translate-y-1/2 text-sm text-muted-foreground",
                size === "lg"
                  ? "top-[calc(0.5rem+24px)]"
                  : "top-[calc(0.5rem+20px)]"
              )
        )}
      >
        {label}
      </span>

      {trigger}
    </div>
  );
}
