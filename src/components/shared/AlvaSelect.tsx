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
  options,
  hasError,
  size = "md",
  className,
}: AlvaSelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <Select value={value} onValueChange={onValueChange} open={open} onOpenChange={setOpen}>
      {/* The beam is held open while the menu is, not just while the trigger
          has focus — a select whose affordance vanishes the moment you open it
          looks like it lost focus. */}
      <FieldBeam active={open || undefined} className={className}>
        <SelectTrigger
          aria-label={ariaLabel}
          className={cn(alvaSelectClass(hasError, size), "w-full")}
        >
          <SelectValue placeholder={placeholder} />
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
}
