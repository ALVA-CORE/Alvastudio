import { useEffect, useState } from "react";
import { listUsers, type ApiUserRole } from "@/lib/api/users";

export type AssignableStaff = {
  id: string;
  name: string;
  detail: string;
};

/**
 * Who an admin can hand work to.
 *
 * Fetched when the dialog opens rather than held on the page, because an
 * assign picker is opened rarely and holding a staff list on every admin
 * screen to serve it would be worse than one request at the moment of use.
 *
 * It does not carry a load count. `AssignPicker` orders by load so the
 * lightest-loaded person is offered first, and the only way to count what
 * someone is holding is to fetch every recording or annotation and tally by
 * assignee. That is a request this dialog should not be making, so the number
 * is left out rather than guessed. See docs/endpoints-needed.md.
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
            .filter((user) => user.is_active)
            .map((user) => ({
              id: user.id,
              name: user.full_name,
              detail: user.email,
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
