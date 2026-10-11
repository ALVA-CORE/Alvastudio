/**
 * HTTP client for the Alva Studio backend.
 *
 * See `docs/api.md` for the endpoint reference. Three jobs: attach the bearer
 * token, normalise the two error shapes FastAPI emits, and keep the base URL in
 * one place so nothing hardcodes `/api/v1`.
 */

/** Overridable per environment; falls back to a same-origin proxy in dev. */
const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ??
  "/api/v1";

const TOKEN_KEY = "alva-auth-token";

/* ------------------------------------------------------------------ *
 * Token storage
 *
 * localStorage rather than an httpOnly cookie because the API issues a bearer
 * token for the client to carry, not a session cookie. That is the backend's
 * choice; if it later sets a cookie, this module is the only thing to change.
 * ------------------------------------------------------------------ */

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    // Private mode, blocked storage — treat as signed out rather than throwing.
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* Nothing useful to do; the request layer will 401 and sign the user out. */
  }
}

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */

/** One field-level complaint from FastAPI's 422 body. */
export type FieldError = { field: string; message: string };

export class ApiError extends Error {
  readonly status: number;
  /** Populated for 422 so forms can attach messages to the right input. */
  readonly fieldErrors: FieldError[];

  constructor(status: number, message: string, fieldErrors: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  /** The token is missing, expired or rejected. */
  get isUnauthorized(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /**
   * The account exists and the password was right, but it cannot be used yet.
   *
   * Two 403s mean this: an intern waiting on admin approval, and a suspended
   * account. Neither is a permissions problem, and neither should clear the
   * session or send anyone to a password reset.
   *
   * Matched on the message because that is what the API gives us to match on;
   * the backend confirmed the wording is deliberate and stable for exactly
   * this purpose. If it ever changes, these fall back to the generic 403
   * message rather than breaking.
   */
  get isPendingApproval(): boolean {
    return this.status === 403 && /awaiting admin approval/i.test(this.message);
  }

  get isAccountSuspended(): boolean {
    return this.status === 403 && /inactive account/i.test(this.message);
  }

  /** The device has no connection at all. */
  get isOffline(): boolean {
    return this.status === 0 && this.offline;
  }

  /** The optional ML stack is not installed — an expected state, not an outage. */
  get isUnavailable(): boolean {
    return this.status === 503;
  }

  /**
   * The request never reached the API — wrong base URL, no dev proxy, or the
   * backend is down. Distinguished from a real 404 because the two need
   * completely different messages: "no such record" versus "no such server".
   */
  get isUnreachable(): boolean {
    return this.status === 0 || this.status === 404 ? this.unreachable : false;
  }

  /** @internal set by the request layer when the body was not JSON. */
  unreachable = false;

  /** @internal set when the browser itself reports no connection. */
  offline = false;
}

/**
 * FastAPI returns `detail` as either a plain string or an array of validation
 * objects. Both arrive as a 4xx, so the caller cannot tell them apart without
 * inspecting the body — which is what this does once, here.
 */
function parseError(status: number, body: unknown): ApiError {
  const detail = (body as { detail?: unknown } | null)?.detail;

  if (typeof detail === "string") return new ApiError(status, detail);

  if (Array.isArray(detail)) {
    const fieldErrors: FieldError[] = detail.map((entry) => {
      const loc = Array.isArray((entry as { loc?: unknown }).loc)
        ? ((entry as { loc: unknown[] }).loc as unknown[])
        : [];
      // `loc` is ["body", "field"] — the tail is the field the form knows about.
      const field = String(loc[loc.length - 1] ?? "");
      const message = String((entry as { msg?: unknown }).msg ?? "Invalid value");
      return { field, message };
    });

    return new ApiError(
      status,
      fieldErrors[0]?.message ?? "Please check the details and try again.",
      fieldErrors
    );
  }

  return new ApiError(status, defaultMessage(status));
}

function defaultMessage(status: number): string {
  // Deliberately neutral. Only the login form knows a 401 means "wrong
  // password"; everywhere else it means the session died.
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have access to that.";
  if (status === 404) return "Not found.";
  if (status === 408) return "That took too long. Please try again.";
  if (status === 413) return "That file is too large.";
  if (status === 415) return "That file type is not supported.";
  if (status === 429) return "Too many tries. Wait a moment and try again.";
  if (status === 503) return "That feature is not available on this server yet.";
  if (status >= 500) return "Something went wrong on our side. Try again shortly.";
  return "Something went wrong.";
}

/* ------------------------------------------------------------------ *
 * Network failures
 * ------------------------------------------------------------------ */

/** How long a request may hang before it is treated as unreachable. */
const TIMEOUT_MS = 20000;

/**
 * The request was still open after {@link TIMEOUT_MS}.
 *
 * Its own message because it is its own situation: something answered, or is
 * about to, and trying again often works. "You're offline" would be a lie and
 * "can't reach" implies nothing is there.
 */
function timeoutError(method: string, path: string): ApiError {
  if (import.meta.env.DEV) {
    console.warn(`[alva] ${method} ${path} timed out after ${TIMEOUT_MS}ms.`);
  }

  const error = new ApiError(
    0,
    "That is taking longer than it should. Please try again."
  );
  error.unreachable = true;
  return error;
}

/**
 * Turns a `fetch` rejection into something a person can act on.
 *
 * `fetch` rejects with the same opaque `TypeError` for every network-level
 * failure, by design: a blocked CORS preflight, a DNS miss, a dead server, a
 * TLS error and a dropped Wi-Fi connection are indistinguishable from inside
 * the page. We spent a day on that once, when a missing CORS origin told every
 * user they were offline while they were plainly online, which sent them to
 * reset their router instead of telling us.
 *
 * So there are exactly two messages, and they split on the one thing the
 * browser will actually tell us: whether it has a connection.
 *
 *  - No connection  → the person can fix it, so name it.
 *  - Connection, no answer → the person cannot fix it, so do not imply they
 *    can. "Can't reach Alvastudio" covers a CORS block, an outage and a
 *    firewall equally, and all three mean "wait, or tell someone".
 *
 * The developer-facing detail goes to the console, where it belongs.
 */
function networkError(method: string, path: string, cause: unknown): ApiError {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  if (import.meta.env.DEV) {
    console.warn(
      `[alva] ${method} ${path} never completed. ` +
        (offline
          ? "The browser reports no connection."
          : "The browser is online, so this is most likely a blocked CORS " +
            "origin, a wrong VITE_API_BASE_URL, or the API being down."),
      cause
    );
  }

  const error = new ApiError(
    0,
    offline
      ? "You're offline. Check your connection and try again."
      : "Can't reach Alvastudio right now. Please try again in a moment."
  );
  error.unreachable = true;
  error.offline = offline;
  return error;
}

/* ------------------------------------------------------------------ *
 * Request
 * ------------------------------------------------------------------ */

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Serialised as JSON. Use `form` for multipart instead. */
  body?: unknown;
  /** Sent as-is; the browser sets the multipart boundary. */
  form?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  /** Skip the Authorization header — register and login are unauthenticated. */
  anonymous?: boolean;
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, form, query, signal, anonymous = false } = options;

  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {};
  if (!anonymous) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  // Only for JSON: setting it on FormData would override the boundary.
  if (body !== undefined) headers["Content-Type"] = "application/json";

  /* A request that never answers is worse than one that fails: the button
   * spins forever and nobody knows whether to wait. Caller aborts are kept
   * separate so a cancellation is never reported as an outage. */
  const timeout = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    timeout.abort();
  }, TIMEOUT_MS);
  const onCallerAbort = () => timeout.abort();
  signal?.addEventListener("abort", onCallerAbort);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal: timeout.signal,
    });
  } catch (cause) {
    // A cancelled request is a navigation, not a failure, so a caller's own
    // abort goes through untouched.
    if (!timedOut && cause instanceof DOMException && cause.name === "AbortError") {
      throw cause;
    }
    if (timedOut) throw timeoutError(method, path);
    throw networkError(method, path, cause);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onCallerAbort);
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("json");

    let parsed: unknown = null;
    if (isJson) {
      try {
        parsed = await response.json();
      } catch {
        /* Declared JSON but unparseable — fall back to the status. */
      }
    }

    /* A non-JSON error body means the request did not hit the API at all: no
     * dev proxy, a wrong VITE_API_BASE_URL, or a gateway page. Reporting the
     * bare status ("Not found") sends people looking for a missing record when
     * the real problem is a missing server. */
    if (!isJson) {
      /* The user-facing message is the same as a dropped connection, because
       * from where they sit it is the same thing. The cause only helps
       * whoever is running the app, so it goes to the console. */
      if (import.meta.env.DEV) {
        console.warn(
          `[alva] ${method} ${path} returned a non-JSON ${response.status}. ` +
            "The request probably never reached the API, check that the backend " +
            "is running and VITE_API_BASE_URL points at it."
        );
      }

      const error = new ApiError(
        response.status,
        "Can't reach Alvastudio right now. Please try again in a moment."
      );
      error.unreachable = true;
      throw error;
    }

    throw parseError(response.status, parsed);
  }

  // 204, or any empty body.
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Fetches a protected binary resource as an object URL, e.g. recording audio. */
export async function apiFetchBlobUrl(path: string): Promise<string> {
  const token = getToken();
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);

  const response = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) throw parseError(response.status, null);

  // The audio routes are authenticated, so an <audio src> pointing straight at
  // them would send no token. Fetch with the header, then hand back a blob URL.
  // Callers must revokeObjectURL when done.
  return URL.createObjectURL(await response.blob());
}
