import { useEffect, useState } from "react";
import {
  getInternProfile,
  internProfileFromApi,
} from "@/lib/api/onboarding";
import { useAuth } from "@/lib/auth/context";
import type { InternProfileData } from "@/lib/validations/auth";

/**
 * What this intern covers, from the API rather than from this browser.
 *
 * The sign-up form collected a primary state, a coverage area and an alert
 * preference, and all three stopped at `localStorage`: they lived in one
 * browser, vanished on a second device, and showed as "Not set" to the
 * person who had typed them. `GET /onboarding/intern-profile` existed the
 * whole time and nothing called it.
 *
 * The cached value is the initial state so the page paints immediately with
 * whatever this browser knows, and the fetch corrects it. A failure leaves
 * the cache in place — on their own device that is the right answer, and on
 * a new one it is the same "Not set" they would have had anyway.
 */
export function useInternProfile(): Partial<InternProfileData> | undefined {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Partial<InternProfileData> | undefined>(
    user?.internProfile
  );

  useEffect(() => {
    if (user?.role !== "intern") return;
    let cancelled = false;

    getInternProfile()
      .then((api) => {
        if (cancelled) return;
        const next = internProfileFromApi(api);
        /* Merged over the cached one rather than replacing it: the API
           holds three fields and the local shape has a device too, which
           has nowhere to live on the server yet. */
        setProfile((current) => ({ ...current, ...next }));
      })
      .catch(() => {
        /* Keep whatever this browser had. */
      });

    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  return profile;
}
