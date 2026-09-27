import type { ReactNode } from "react";
import { adminNavItem, type AdminAreaStatus, type AdminNavId } from "@/components/admin/layout/adminNav";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<AdminAreaStatus, string> = {
  ready: "Sample data · API ready",
  partial: "Sample data · API partly ready",
  blocked: "Sample data · blocked on backend",
};

type AdminPageHeaderProps = {
  id: AdminNavId;
  /** Overrides the nav table's blurb where a page wants to say more. */
  blurb?: string;
  actions?: ReactNode;
};

/**
 * Title row for an admin page.
 *
 * The status pill is not decoration. Every screen on this surface is drawn from
 * sample data while the design is settled, and several are waiting on endpoints
 * that do not exist — a page that looks finished and is quietly inventing its
 * numbers is worse than one that says so. The pill also carries what the area
 * is waiting on, straight from the nav table, so the two cannot drift.
 */
export function AdminPageHeader({ id, blurb, actions }: AdminPageHeaderProps) {
  const item = adminNavItem(id);
  const { title, status, blockedBy, Icon } = item;

  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-alva-card">
          <Icon size={20} weight="BoldDuotone" className="text-alva-accent" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {blurb ?? item.blurb}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <span
          title={blockedBy ? `Waiting on: ${blockedBy}` : undefined}
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
            status === "ready" && "bg-alva-accent/15 text-alva-accent",
            status === "partial" && "bg-amber-500/15 text-amber-300",
            status === "blocked" && "bg-alva-surface text-muted-foreground"
          )}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>
    </header>
  );
}
