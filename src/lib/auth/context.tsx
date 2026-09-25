import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AnnotatorProfileData,
  AuthUser,
  ContributorProfileData,
  InternProfileData,
  UserRole,
} from "@/lib/validations/auth";
import * as authApi from "@/lib/api/auth";
import type { ApiUser } from "@/lib/api/auth";
import { ApiError, getToken } from "@/lib/api/client";
import { profileToApi, recordConsent, upsertProfile } from "@/lib/api/onboarding";

/**
 * Session state, backed by the API (`docs/api.md` §3).
 *
 * The bearer token is the session; the cached user is a convenience so the app
 * can paint before `/auth/me` returns. On boot, a token is verified against
 * `/auth/me` and the cache is replaced with whatever the server says — the
 * server is authoritative about role and identity, the cache never is.
 *
 * Profile fields the API does not model (see `docs/api.md` §14) are kept in the
 * local record so the profile pages still render. They are explicitly NOT
 * durable: a fresh login on another device will not have them.
 */

const STORAGE_KEY = "alva-auth-user";

type SignupPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role?: UserRole;
  internProfile?: InternProfileData;
  contributorProfile?: ContributorProfileData;
  annotatorProfile?: AnnotatorProfileData;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True while the boot-time `/auth/me` is in flight. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (payload: SignupPayload) => Promise<AuthUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function persistUser(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Blocked storage just means the session does not survive a reload. */
  }
}

/**
 * The API's role enum is `contributor | intern | admin` — there is no
 * `annotator`. Until the backend adds one, an annotator cannot be represented
 * by a real account, so the frontend role is passed through unchanged and the
 * server's answer wins for everyone else.
 */
function toAppRole(role: ApiUser["role"]): UserRole {
  return role;
}

/** Roles the API will accept at registration. */
function toApiRole(role: UserRole | undefined): ApiUser["role"] {
  if (role === "intern" || role === "admin") return role;
  // `annotator` has no server-side equivalent; register as a contributor rather
  // than sending a value the API will reject outright.
  return "contributor";
}

function mergeUser(apiUser: ApiUser, local?: Partial<AuthUser>): AuthUser {
  return {
    id: apiUser.id,
    fullName: apiUser.full_name,
    email: apiUser.email,
    phone: apiUser.phone ?? undefined,
    role: toAppRole(apiUser.role),
    // Local-only extras. Preserved across a refresh, lost across devices.
    onboardingComplete: local?.onboardingComplete,
    internProfile: local?.internProfile,
    contributorProfile: local?.contributorProfile,
    annotatorProfile: local?.annotatorProfile,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadUser());
  const [isLoading, setLoading] = useState(() => Boolean(getToken()));

  /* Verify a stored token once on boot. A cached user with a dead token would
   * otherwise let the UI render a signed-in shell that 401s on every request. */
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    authApi
      .me()
      .then((apiUser) => {
        if (cancelled) return;
        const next = mergeUser(apiUser, loadUser() ?? undefined);
        setUser(next);
        persistUser(next);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Only an auth failure means "signed out". A network blip should not
        // throw away a usable session.
        if (error instanceof ApiError && error.isUnauthorized) {
          authApi.clearSession();
          setUser(null);
          persistUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* Refresh a live token before it dies rather than after.
   *
   * Waiting for a 401 means the annotator loses whatever they were mid-way
   * through. The token's lifetime is only knowable from `expires_in`, so this
   * schedules against the stored expiry and re-arms after each refresh. */
  useEffect(() => {
    if (!user) return;

    let timer: number | undefined;

    const schedule = () => {
      const expiry = authApi.getExpiry();
      if (!expiry) return;

      // A minute of headroom, and never a negative delay.
      const delay = Math.max(15_000, expiry - Date.now() - 60_000);

      timer = window.setTimeout(async () => {
        try {
          const token = await authApi.refresh();
          if (token.expires_in) {
            authApi.setExpiry(Date.now() + token.expires_in * 1000);
          }
          schedule();
        } catch {
          /* Leave the session alone. The next request will 401 and the
           * interceptor path signs them out with a message. */
        }
      }, delay);
    };

    schedule();
    return () => window.clearTimeout(timer);
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    await authApi.login(email, password);
    const apiUser = await authApi.me();

    const next = mergeUser(apiUser, loadUser() ?? undefined);
    setUser(next);
    persistUser(next);
    return next;
  }, []);

  const signup = useCallback(async (payload: SignupPayload) => {
    await authApi.register({
      email: payload.email,
      password: payload.password,
      full_name: payload.fullName,
      phone: payload.phone || null,
      role: toApiRole(payload.role),
    });

    // Register does not return a token, so sign in to get one.
    await authApi.login(payload.email, payload.password);
    const apiUser = await authApi.me();

    /* Onboarding extras are written after the account exists, because both
     * endpoints are authenticated. A failure here must not fail the signup —
     * the account is real and usable, and the profile can be completed later. */
    if (payload.contributorProfile) {
      try {
        await upsertProfile(profileToApi(payload.contributorProfile));
        await recordConsent({ accepted: true });
      } catch {
        /* Non-fatal: the account exists and the form data stays cached locally. */
      }
    }

    const next: AuthUser = {
      ...mergeUser(apiUser),
      ...(payload.contributorProfile
        ? { onboardingComplete: true, contributorProfile: payload.contributorProfile }
        : {}),
      internProfile: payload.internProfile,
      annotatorProfile: payload.annotatorProfile,
    };

    setUser(next);
    persistUser(next);
    return next;
  }, []);

  const logout = useCallback(() => {
    // The API issues a stateless bearer token with no revoke endpoint, so
    // signing out is purely local: drop the token and the cached user.
    authApi.clearSession();
    setUser(null);
    persistUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      signup,
      logout,
    }),
    [user, isLoading, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
