import { ApiError } from "@/lib/api/client";
import { alvaToast } from "@/lib/alva-toast";

/** Set while an offline toast is on screen, so a page of failing requests
 *  does not stack five identical ones. */
let offlineToastAt = 0;
const OFFLINE_QUIET_MS = 6000;

/**
 * Decides where a failed request is reported.
 *
 * A dropped connection is about the *device*, not about the thing on screen,
 * so it belongs in a toast — one for the whole app, that goes away when the
 * connection comes back. Pinning it inside a card implies that card is broken
 * and leaves a red box sitting there after the network recovers.
 *
 * Everything else is specific to what was being loaded, so it stays inline
 * where the retry is.
 *
 * Returns the message to show inline, or null when the toast has taken it.
 */
export function reportApiError(cause: unknown, fallback = "Something went wrong."): string | null {
  if (cause instanceof ApiError && cause.isUnreachable) {
    const now = Date.now();
    if (now - offlineToastAt > OFFLINE_QUIET_MS) {
      offlineToastAt = now;
      alvaToast.error(cause.message);
    }
    return null;
  }

  return cause instanceof ApiError ? cause.message : fallback;
}

/** Test seam — the quiet period is module state. */
export function __resetApiErrorReporter() {
  offlineToastAt = 0;
}
