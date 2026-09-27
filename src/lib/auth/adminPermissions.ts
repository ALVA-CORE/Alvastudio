import type { AdminNavId } from "@/components/admin/layout/adminNav";
import type { AdminPermission } from "@/data/admin/users";

/**
 * Which admin areas the signed-in account may open.
 *
 * Two areas are never gated. `overview` is the landing page — an admin who
 * cannot open it has nowhere to be sent after login — and `settings` is their
 * own account, which is not an admin capability at all.
 *
 * The check is a convenience, not a security boundary. Anything it hides is
 * still reachable by typing the URL until the server refuses it, so the same
 * rule has to exist on the API. This stops an admin being shown a page full of
 * controls that will fail when they use them.
 */
const ALWAYS_ALLOWED: AdminNavId[] = ["overview", "settings"];

export function canOpenAdminArea(
  area: AdminNavId,
  /** Undefined means unrestricted — the bootstrap admin, and anyone pre-dating
   *  per-account permissions. An empty array means genuinely nothing. */
  permissions: AdminPermission[] | undefined
): boolean {
  if (ALWAYS_ALLOWED.includes(area)) return true;
  if (permissions === undefined) return true;
  return permissions.includes(area as AdminPermission);
}

export function allowedAdminAreas<T extends { id: AdminNavId }>(
  items: T[],
  permissions: AdminPermission[] | undefined
): T[] {
  return items.filter((item) => canOpenAdminArea(item.id, permissions));
}
