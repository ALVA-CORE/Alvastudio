import { useEffect, useState } from "react";
import { getCapacity } from "@/lib/api/capacity";

/**
 * Whether the sign-up page should let somebody start at all.
 *
 * Checked on arrival rather than only on submit, so a closed platform is the
 * first thing somebody reads instead of the thing they discover after
 * filling in nine fields.
 *
 * The submit path still handles the refusal. This is the courtesy; the API's
 * `403` is the boundary, and it has to be, because a check in the browser is
 * a check anybody can skip.
 *
 * `undefined` while unknown, so a page can wait rather than flashing a form
 * it is about to take away.
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
