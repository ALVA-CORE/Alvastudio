import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { alvaSelectClass } from "@/lib/alva-form-styles";
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
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger aria-label={ariaLabel} className={cn(alvaSelectClass(hasError, size), className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
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
