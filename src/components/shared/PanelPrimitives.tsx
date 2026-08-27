import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared vocabulary for reference panels — sidebars, detail sheets, profile
 * sections.
 *
 * All of them render the same kinds of thing: a titled section, a label/value
 * row, a rule between topics. The grammar lives here so it cannot drift between
 * surfaces, and as a plain module rather than exports hanging off one panel,
 * which would put its consumers in an import cycle.
 *
 * The rule these encode: a value does NOT get its own filled box. Nine boxed
 * values down a panel draw a border around each single word, so the eye parses
 * nine containers to read nine facts. Rows on hairlines carry the same content
 * with one alignment to follow and no containers at all.
 */

/** Section heading. One weight, one tracking, both tabs. */
export const PANEL_SECTION_LABEL =
  "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground";

/**
 * Full-bleed rule between sections.
 *
 * Deliberately heavier than the hairlines *inside* a section, and edge-to-edge
 * rather than inset, so it reads as "new topic" instead of "next row". If the
 * two were the same weight the grouping would collapse into one long list.
 */
export function PanelDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("-mx-4 my-4 border-t border-alva-border", className)} />
  );
}

/** A titled group of rows. */
export function PanelSection({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: ReactNode;
  /** Optional trailing control, e.g. a badge. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className={PANEL_SECTION_LABEL}>
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Label left, value right, hairline between. No fill. */
export function PanelRow({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3 border-b border-alva-border/50 py-1.5 last:border-0",
        className
      )}
    >
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right text-xs text-foreground">{value}</dd>
    </div>
  );
}
