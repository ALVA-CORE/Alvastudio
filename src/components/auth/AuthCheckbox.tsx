import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import CheckRead from "@solar-icons/react/messages/CheckRead";
import { cn } from "@/lib/utils";

type AuthCheckboxProps = React.ComponentPropsWithoutRef<
  typeof CheckboxPrimitive.Root
>;

export function AuthCheckbox({ className, ...props }: AuthCheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer size-3.5 shrink-0 rounded-[4px] border border-muted-foreground/40 ring-offset-background",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <CheckRead size={10} weight="Linear" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
