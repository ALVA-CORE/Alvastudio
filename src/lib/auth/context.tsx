import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser, InternProfileData, UserRole } from "@/lib/validations/auth";

const STORAGE_KEY = "alva-auth-user";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => AuthUser;
  signup: (payload: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role?: UserRole;
    internProfile?: InternProfileData;
  }) => AuthUser;
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
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEY);
}

/** Mock auth until Supabase is wired. Intern role if email contains "intern". */
function resolveRole(email: string, role?: UserRole): UserRole {
  if (role) return role;
  if (email.includes("admin")) return "admin";
  if (email.includes("intern")) return "intern";
  return "contributor";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadUser());

  const login = useCallback((email: string, _password: string) => {
    const next: AuthUser = {
      id: crypto.randomUUID(),
      fullName: email.split("@")[0] ?? "User",
      email,
      role: resolveRole(email),
    };
    setUser(next);
    persistUser(next);
    return next;
  }, []);

  const signup = useCallback(
    (payload: {
      fullName: string;
      email: string;
      phone: string;
      password: string;
      role?: UserRole;
      internProfile?: InternProfileData;
    }) => {
      const next: AuthUser = {
        id: crypto.randomUUID(),
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        role: resolveRole(payload.email, payload.role),
        internProfile: payload.internProfile,
      };
      setUser(next);
      persistUser(next);
      return next;
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    persistUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      signup,
      logout,
    }),
    [user, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
