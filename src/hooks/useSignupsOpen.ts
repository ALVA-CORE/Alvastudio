import { useEffect, useState } from "react";
import { getCapacity } from "@/lib/api/capacity";

/**
 * Whether a contributor signing up now gets straight in.
 *
 * Read on arrival so the page can say what will happen before nine fields
 * are filled in, rather than after. It is **not** the boundary — the account
 * is created either way, and the register response's `waitlisted` is what
 * actually decides. A check in the browser is a check anybody can skip.
 *
 * `accepting`, not `open`: the API folds "an admin closed it" and "the limit
 * is reached" into one answer, and re-deriving that here would be a second
 * copy of a rule the server owns.
 *
 * `undefined` while unknown, so a page can wait rather than flashing a form
 * it is about to change.
 */
export function useSignupsOpen(): boolean | undefined {
  const [open, setOpen] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    getCapacity()
      .then((state) => {
        if (!cancelled) setOpen(state.open);
      })
      .catch(() => {
        /* Unknown reads as open. A form nobody can use is a worse failure
           than one the API refuses at the end. */
        if (!cancelled) setOpen(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return open;
}
