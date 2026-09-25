import { apiFetch, setToken } from "./client";
import type { ApiUserRole } from "./enums";

/** `UserOut` — `docs/api.md` §3. */
export type ApiUser = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: ApiUserRole;
  is_active: boolean;
  created_at: string;
};

export type ApiToken = {
  access_token: string;
  token_type: string;
  /** Seconds until the token dies. Drives the pre-emptive refresh. */
  expires_in: number;
};

export type RegisterPayload = {
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
  role?: ApiUserRole;
};

/** `POST /auth/register` — unauthenticated. */
export function register(payload: RegisterPayload): Promise<ApiUser> {
  return apiFetch<ApiUser>("/auth/register", {
    method: "POST",
    body: payload,
    anonymous: true,
  });
}

/**
 * `POST /auth/login` and store the token.
 *
 * The JSON endpoint, not `/auth/token` — that one is the OAuth2 password flow
 * powering Swagger's Authorize button, and takes the email in a field named
 * `username` as form-encoded data. Same token either way; this one is honest
 * about what it wants.
 */
export async function login(email: string, password: string): Promise<ApiToken> {
  const token = await apiFetch<ApiToken>("/auth/login", {
    method: "POST",
    body: { email, password },
    anonymous: true,
  });

  setToken(token.access_token);
  if (token.expires_in) setExpiry(Date.now() + token.expires_in * 1000);
  return token;
}

/** `GET /auth/me` — the source of truth for who the bearer token belongs to. */
export function me(): Promise<ApiUser> {
  return apiFetch<ApiUser>("/auth/me");
}

/** `POST /auth/refresh` — exchanges a live token for a fresh one. */
export async function refresh(): Promise<ApiToken> {
  const token = await apiFetch<ApiToken>("/auth/refresh", { method: "POST" });
  setToken(token.access_token);
  return token;
}

export function clearSession(): void {
  setToken(null);
  setExpiry(null);
}

/* ------------------------------------------------------------------ *
 * Expiry tracking
 *
 * The token is opaque to us, so its lifetime is only knowable from the
 * `expires_in` the login response carries. Stored alongside so a page reload
 * can still schedule a refresh instead of waiting to be 401'd mid-task.
 * ------------------------------------------------------------------ */

const EXPIRY_KEY = "alva-auth-expires-at";

export function setExpiry(expiresAt: number | null): void {
  try {
    if (expiresAt) localStorage.setItem(EXPIRY_KEY, String(expiresAt));
    else localStorage.removeItem(EXPIRY_KEY);
  } catch {
    /* Refresh falls back to reactive-on-401. */
  }
}

export function getExpiry(): number | null {
  try {
    const raw = localStorage.getItem(EXPIRY_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}
