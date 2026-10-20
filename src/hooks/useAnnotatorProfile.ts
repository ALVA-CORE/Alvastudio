import { useEffect, useState } from "react";
import { getAnnotatorProfile } from "@/lib/api/onboarding";
import { fromApiVariety } from "@/lib/api/enums";

export type AnnotatorClearance = {
  /** Varieties they may tag, as a sentence. Empty when none are set. */
  varieties: string;
  /** Sessions they cover, as a sentence. Empty when none are set. */
  scope: string;
};

/**
 * What this annotator is cleared for, from `/onboarding/annotator-profile`.
 *
 * The profile page used to print "Nigerian English, Nigerian Pidgin" and "All
 * focus group sessions" as fixed strings, which happened to be the common case
 * and would have gone on being printed for somebody cleared for neither.
 *
 * Empty rather than guessed when the profile has never been set: "not set" and
 * "cleared for everything" are opposite answers and must not share a label.
 */
export function useAnnotatorProfile() {
  const [clearance, setClearance] = useState<AnnotatorClearance | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getAnnotatorProfile()
      .then((profile) => {
        if (cancelled) return;
        setClearance({
          varieties: (profile.language_varieties ?? [])
            .map((variety) => fromApiVariety(variety))
            .join(", "),
          scope: (profile.sessions_covered ?? []).join(", "),
        });
      })
      .catch(() => {
        if (!cancelled) setClearance(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { clearance, isLoading };
}
