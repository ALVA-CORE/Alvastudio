import { useId, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { alvaFieldClass } from "@/lib/alva-form-styles";
import { cn } from "@/lib/utils";

/** A titled group of facts, two to a row. */
export function DetailGroup({
  title,
  children,
  first,
  action,
}: {
  title: string;
  children: ReactNode;
  first?: boolean;
  /** Trailing control on the heading row. */
  action?: ReactNode;
}) {
  return (
    <section className={cn(!first && "mt-6 border-t border-alva-border pt-6")}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {action}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4">{children}</dl>
    </section>
  );
}

/** Label above value. Truncates rather than wrapping — the title carries it. */
export function DetailField({
  label,
  value,
  span,
  tone,
}: {
  label: string;
  value: ReactNode;
  span?: boolean;
  tone?: "default" | "muted" | "danger" | "accent";
}) {
  return (
    <div className={cn("min-w-0", span && "col-span-2")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 truncate text-sm",
          tone === "danger" && "text-red-400",
          tone === "accent" && "text-alva-accent",
          tone === "muted" && "text-muted-foreground",
          (!tone || tone === "default") && "text-foreground"
        )}
        title={typeof value === "string" ? value : undefined}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

/**
 * The same slot, editable — so the layout does not shift when Edit is hit.
 *
 * Explicitly associated with `htmlFor`, not by nesting: the field's focus beam
 * wraps the input in its own elements, and an implicit label stops reaching
 * through them.
 */
export function DetailEditField({
  label,
  value,
  onChange,
  span,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  span?: boolean;
  type?: string;
}) {
  const id = useId();

  return (
    <div className={cn("min-w-0", span && "col-span-2")}>
      <label htmlFor={id} className="block text-xs text-muted-foreground">
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        wrapperClassName="mt-1"
        className={cn(alvaFieldClass(), "h-9")}
      />
    </div>
  );
}

/** Full-width prose inside a group — a prompt, a note, a topic. */
export function DetailProse({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="col-span-2 min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-foreground">{children}</dd>
    </div>
  );
}
