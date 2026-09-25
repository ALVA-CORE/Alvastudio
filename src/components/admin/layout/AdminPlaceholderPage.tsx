import Tuning from "@solar-icons/react/settings/Tuning";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { AlvaEmptyState } from "@/components/shared/states/AlvaEmptyState";
import { cn } from "@/lib/utils";
import { adminNavItem, type AdminAreaStatus, type AdminNavId } from "./adminNav";

const STATUS_LABELS: Record<AdminAreaStatus, string> = {
  ready: "API ready",
  partial: "API partly ready",
  blocked: "Blocked on backend",
};

/**
 * Stands in for an admin area until it is built.
 *
 * It states which endpoints the area is waiting on rather than showing a bare
 * "coming soon", so the routing can go in now and anyone clicking through can
 * see exactly what is outstanding. Replace the whole component per area as each
 * one lands — nothing here is meant to survive.
 */
export function AdminPlaceholderPage({ id }: { id: AdminNavId }) {
  const { title, blurb, status, blockedBy, Icon } = adminNavItem(id);

  return (
    <DesktopPageShell className="py-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-alva-card">
            <Icon size={20} weight="BoldDuotone" className="text-alva-accent" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{blurb}</p>
          </div>
        </div>

        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium",
            status === "ready" && "bg-alva-accent/15 text-alva-accent",
            status === "partial" && "bg-amber-500/15 text-amber-300",
            status === "blocked" && "bg-alva-surface text-muted-foreground"
          )}
        >
          {STATUS_LABELS[status]}
        </span>
      </header>

      <div className="mt-4 rounded-2xl border border-alva-border bg-alva-card">
        <AlvaEmptyState
          icon={<Tuning size={20} weight="Outline" />}
          title="Not built yet"
          description={
            blockedBy
              ? `Waiting on: ${blockedBy}.`
              : "The endpoints for this area exist — the screen is next."
          }
        />
      </div>
    </DesktopPageShell>
  );
}
