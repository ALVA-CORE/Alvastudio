import { cn } from "@/lib/utils";

/**
 * The label that starts as the placeholder and rides up onto the border.
 *
 * It is the product's one field label. Written once here because three
 * controls needed it — select, multi-select, combobox — and a fourth copy is
 * how one of them ends up two pixels out.
 *
 * **It replaces a label above the field, it does not join one.** A stacked
 * label plus a floating label is the same question asked twice, which is what
 * the intern and annotator sign-ups were doing.
 *
 * It is `aria-hidden` and purely visual. The control underneath carries the
 * name itself through `aria-label`, because a span that animates out of a
 * field cannot be a `<label for>` without the browser scrolling to it.
 *
 * Lifted while the menu is open as well as when something is chosen, so it
 * gets out of the way of the list instead of sitting under it.
 */
export function FloatingFieldLabel({
  label,
  lifted,
  size = "md",
  className,
  children,
}: {
  /** Omit and this renders the control alone, with no wrapper. */
  label?: string;
  lifted: boolean;
  size?: "md" | "lg";
  className?: string;
  children: React.ReactNode;
}) {
  if (!label) return <>{children}</>;

  return (
    <div className={cn("relative overflow-visible pt-2", className)}>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute z-20 max-w-[calc(100%-3.5rem)] truncate transition-all duration-200 ease-out",
          lifted
            ? "left-4 top-2 -translate-y-1/2 text-[11px] font-medium leading-none text-alva-accent"
            : cn(
                "left-4 -translate-y-1/2 text-sm text-muted-foreground",
                size === "lg" ? "top-[calc(0.5rem+24px)]" : "top-[calc(0.5rem+20px)]"
              )
        )}
      >
        {label}
      </span>

      {children}
    </div>
  );
}
