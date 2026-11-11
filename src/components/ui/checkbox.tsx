import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import CheckRead from "@solar-icons/react/messages/CheckRead";
import { cn } from "@/lib/utils";

/**
 * A box for picking rows. Checked is the accent with dark ink; `indeterminate`
 * (some of a page picked) is a bar rather than a tick.
 */
export function Checkbox({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-muted-foreground/40 transition-colors",
        "hover:border-muted-foreground/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alva-accent focus-visible:ring-offset-1 focus-visible:ring-offset-alva-surface",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "data-[state=checked]:border-alva-accent data-[state=checked]:bg-alva-accent data-[state=checked]:text-alva-bg",
        "data-[state=indeterminate]:border-alva-accent data-[state=indeterminate]:bg-alva-accent data-[state=indeterminate]:text-alva-bg",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="group flex items-center justify-center">
        <CheckRead size={11} weight="Linear" className="group-data-[state=indeterminate]:hidden" />
        <span className="hidden h-0.5 w-2 rounded-full bg-current group-data-[state=indeterminate]:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
