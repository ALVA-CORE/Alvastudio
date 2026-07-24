import { cn } from "@/lib/utils";

export const alvaInputClass =
  "h-10 rounded-full border-0 bg-alva-surface text-foreground shadow-none focus-visible:ring-2 focus-visible:ring-alva-accent/30";

export const alvaSelectTriggerClass =
  "h-10 rounded-full border-0 bg-alva-surface text-foreground shadow-none focus:ring-2 focus:ring-alva-accent/30";

export function alvaFieldClass(hasError?: boolean) {
  return cn(alvaInputClass, hasError && "ring-1 ring-destructive");
}

export function alvaSelectClass(hasError?: boolean) {
  return cn(alvaSelectTriggerClass, hasError && "ring-1 ring-destructive");
}
