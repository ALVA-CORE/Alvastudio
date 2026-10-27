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
import { FloatingFieldLabel } from "@/components/shared/FloatingFieldLabel";
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

/**
 * A single choice from a list.
 *
 * The lifted label lives in `FloatingFieldLabel`, shared with the
 * multi-select and the combobox so the three cannot drift apart.
 */
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
          className={cn(alvaSelectClass(hasError, size), "w-full")}
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

  return (
    <FloatingFieldLabel label={label} lifted={lifted} size={size} className={className}>
      {trigger}
    </FloatingFieldLabel>
  );
}
