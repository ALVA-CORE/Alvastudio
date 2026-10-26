import { COMPANY, versionFor } from "@/data/version";
import { useAuth } from "@/lib/auth/context";

/**
 * What this person is running, at the foot of their profile.
 *
 * The version is per role, not per app: the roles ship on different clocks,
 * and a contributor told their app is on 1.6.0 because the admin surface
 * moved would be reading somebody else's news.
 *
 * Text, not a button. It opened a list of what the version brought, which is
 * a release note in the one place nobody goes looking for one — and a line of
 * small print that moves when tapped reads as something broken. The number is
 * here to be read out in a support message, and that is all it needs to do.
 *
 * The notes still live in `src/data/version.ts`, beside the number they
 * belong to, which is where they are useful to whoever bumps it.
 */
export function AppVersionFooter() {
  const { user } = useAuth();
  const release = versionFor(user?.role);

  if (!release) return null;

  return (
    <footer className="mt-10 pb-6 text-center">
      <p className="text-xs text-muted-foreground">
        {COMPANY} v{release.version}
      </p>
    </footer>
  );
}
