import { apiFetch, ApiError } from "./client";

/**
 * Whether the platform is taking new people.
 *
 * **The API does not serve this yet.** Asked for in
 * `docs/backend/endpoints-needed.md`; until it lands the switch is kept in
 * this browser so an admin can work, and the confirm dialog says plainly
 * what that does and does not cover.
 *
 * It has to become the API's, not because local storage is inconvenient but
 * because `POST /auth/register` is a public route: a door the client closes
 * is not closed. When the endpoint exists these two functions start
 * answering from it and nothing above them changes.
 */

export type PlatformCapacity = {
  /** False once an admin has closed it, or the limit is reached. */
  open: boolean;
  /** Accounts counted towards the limit. Null when only the client knows. */
  accounts: number | null;
  /** The number it closes at. Null while nobody has set one. */
  limit: number | null;
};

const LOCAL_KEY = "alva-signups-open";

function readLocal(): boolean {
  try {
    return localStorage.getItem(LOCAL_KEY) !== "closed";
  } catch {
    return true;
  }
}

function writeLocal(open: boolean) {
  try {
    if (open) localStorage.removeItem(LOCAL_KEY);
    else localStorage.setItem(LOCAL_KEY, "closed");
  } catch {
    /* Blocked storage: the switch simply does not persist. */
  }
}

/** A route that is not deployed, told apart from one that failed. */
function isMissing(cause: unknown) {
  return cause instanceof ApiError && (cause.status === 404 || cause.status === 405);
}

export async function getCapacity(): Promise<PlatformCapacity> {
  try {
    return await apiFetch<PlatformCapacity>("/platform/capacity", {
      anonymous: true,
    });
  } catch (cause) {
    if (!isMissing(cause)) throw cause;
    return { open: readLocal(), accounts: null, limit: null };
  }
}

export async function setCapacityOpen(open: boolean): Promise<PlatformCapacity> {
  try {
    return await apiFetch<PlatformCapacity>("/platform/capacity", {
      method: "PATCH",
      body: { open },
    });
  } catch (cause) {
    if (!isMissing(cause)) throw cause;
    writeLocal(open);
    return { open, accounts: null, limit: null };
  }
}

/** True while the switch is only this browser's, so screens can say so. */
export const isCapacityLocalOnly = (state: PlatformCapacity) =>
  state.accounts === null && state.limit === null;
