import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared vocabulary for the session panel.
 *
 * Both tabs render the same kinds of thing — a titled section, a label/value
 * row, a rule between topics — so the grammar lives here rather than being
 * duplicated per tab and drifting. It is also a plain module rather than
 * exports on one of the tabs, which would put `SessionMetaSidebar` and
 * `TagInspector` in an import cycle.
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
}: {
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-alva-border/50 py-1.5 last:border-0">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right text-xs text-foreground">{value}</dd>
    </div>
  );
}
