import { apiFetch } from "./client";

/**
 * Whether the platform is taking new contributors.
 *
 * **Served by the API since 27 Oct.** It used to be kept in `localStorage`
 * with a caveat on the dialog, because `POST /auth/register` is public and a
 * door the client closes is not closed. That is over: the switch is enforced
 * on the server, so it reaches everybody rather than the browser it was
 * pressed in, and there is no local fallback left to drift out of step.
 *
 * Contributors only. An intern or an annotator already waits on an admin, so
 * a cap adds nothing to their sign-up.
 */

export type PlatformCapacity = {
  /** The switch an admin flips. */
  open: boolean;
  /**
   * Contributors who are **in**: approved and not deactivated.
   *
   * Not the same number as the admin dashboard's contributor count, which
   * counts accounts — the waiting list included. Deactivating somebody frees
   * a place, and this can sit *above* `limit`, because an admin may let
   * someone in off the list while the platform is full.
   */
  accounts: number;
  /** The number it closes at on its own. Null means no cap. */
  limit: number | null;
  /**
   * `open` AND below `limit`, worked out by the API.
   *
   * The field to read. `open: true` with `accounts` at `limit` is closed, and
   * deriving that here would be a second implementation of a rule the server
   * already owns.
   */
  accepting: boolean;
};

export const getCapacity = () =>
  apiFetch<PlatformCapacity>("/platform/capacity", { anonymous: true });

/** Sends only what changed; `{}` would change nothing. */
export const setCapacityOpen = (open: boolean) =>
  apiFetch<PlatformCapacity>("/platform/capacity", {
    method: "PATCH",
    body: { open },
  });

/** `null` removes the cap. A negative number or one over 2^31-1 is a 422. */
export const setCapacityLimit = (limit: number | null) =>
  apiFetch<PlatformCapacity>("/platform/capacity", {
    method: "PATCH",
    body: { limit },
  });
