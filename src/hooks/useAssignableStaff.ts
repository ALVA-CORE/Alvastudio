import { useEffect, useState } from "react";
import { listUsers, type ApiUserRole } from "@/lib/api/users";

export type AssignableStaff = {
  id: string;
  name: string;
  detail: string;
  /** Annotations still on their desk. The picker offers the lightest first. */
  load?: number;
};

/**
 * Who an admin can hand work to.
 *
 * Fetched when the dialog opens rather than held on the page, because an
 * assign picker is opened rarely and holding a staff list on every admin
 * screen to serve it would be worse than one request at the moment of use.
 *
 * `open_count` comes back on the user now, so the picker can offer the
 * lightest-loaded person first again without this dialog fetching every
 * annotation to tally them.
 */
export function useAssignableStaff(roles: ApiUserRole[], enabled: boolean) {
  const [people, setPeople] = useState<AssignableStaff[]>([]);
  const [isLoading, setLoading] = useState(false);

  const key = roles.join(",");

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);

    /* One call per role: `GET /users` filters by a single role, and the two
     * lists are short enough that paging them together is not worth it. */
    Promise.all(
      key.split(",").map((role) =>
        listUsers({ role: role as ApiUserRole, limit: 200 })
      )
    )
      .then((pages) => {
        if (cancelled) return;
        setPeople(
          pages
            .flatMap((page) => page.items)
            /* Active AND approved. Assigning either is refused — a
             * deactivated person with a 400, an unapproved one by every
             * route they would need to do the work. */
            .filter((user) => user.is_active && user.approved)
            .map((user) => ({
              id: user.id,
              name: user.full_name,
              detail: user.email,
              load: user.open_count ?? undefined,
            }))
        );
      })
      .catch(() => {
        if (!cancelled) setPeople([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  return { people, isLoading };
}
