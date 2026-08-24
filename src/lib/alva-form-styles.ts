import { cn } from "@/lib/utils";

/**
 * Shared field styling.
 *
 * These override the shadcn primitives, so this file — not `ui/input.tsx` — is
 * the source of truth for how a field looks anywhere in the product.
 *
 * Three rules:
 *  - Rounded, never a pill. A pill field reads as a button.
 *  - No border at rest. The `bg-alva-surface` fill alone marks the field; a
 *    border only appears once the field is being used.
 *  - The focus border is neutral, not accent. Accent is scarce and belongs to
 *    the one primary action on screen — on the auth forms `BeamInput` already
 *    carries a border beam on focus, and a green ring underneath it competed
 *    with both that and the submit button.
 */

const FIELD_BASE =
  "rounded-xl border border-transparent bg-alva-surface text-foreground shadow-none " +
  "focus-visible:border-alva-border focus-visible:outline-none focus-visible:ring-0";

const SELECT_BASE =
  "rounded-xl border border-transparent bg-alva-surface text-foreground shadow-none " +
  "focus:border-alva-border focus:outline-none focus:ring-0";

export const alvaInputClass = cn(
  "h-10 placeholder:text-muted-foreground",
  FIELD_BASE
);

export const alvaSelectTriggerClass = cn("h-10", SELECT_BASE);

export const alvaAuthSelectTriggerClass = cn("h-12", SELECT_BASE);

export function alvaFieldClass(hasError?: boolean) {
  return cn(alvaInputClass, hasError && "border-red-400/60");
}

export function alvaSelectClass(hasError?: boolean, size: "md" | "lg" = "md") {
  return cn(
    size === "lg" ? alvaAuthSelectTriggerClass : alvaSelectTriggerClass,
    hasError && "border-red-400/60"
  );
}
