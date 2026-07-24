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
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options: AlvaSelectOption[];
  hasError?: boolean;
  className?: string;
};

export function AlvaSelect({
  value,
  onValueChange,
  placeholder,
  options,
  hasError,
  className,
}: AlvaSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn(alvaSelectClass(hasError), className)}>
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
