import type { ReactNode } from "react";
import { adminNavItem, type AdminNavId } from "@/components/admin/layout/adminNav";

/**
 * Title row for an admin page.
 *
 * Title and actions, nothing else. The icon repeated what the rail already
 * shows two inches to the left, and the subtitle restated the title in a
 * sentence — both were furniture on a page whose job is to get out of the way
 * of a table.
 */
export function AdminPageHeader({
  id,
  actions,
}: {
  id: AdminNavId;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold text-foreground">
        {adminNavItem(id).title}
      </h1>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
