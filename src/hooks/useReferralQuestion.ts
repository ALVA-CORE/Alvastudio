import { useCallback, useEffect, useState } from "react";
import { getProfile, upsertProfile } from "@/lib/api/onboarding";
import type { ReferralSource } from "@/data/contributors/onboarding";

/**
 * "How did you hear about Alva?", for contributors who were never asked.
 *
 * Sign-up asks it since 2 Nov, so everyone from before then, and anyone who
 * reached the platform another way, has no answer. The feedback form offers
 * it to them, and to nobody else: `needed` is true only once their profile
 * has been read and has no `referral_source`.
 *
 * Contributors only, because the corpus count it feeds is of contributor
 * accounts. Anything that goes wrong reading the profile leaves the question
 * hidden: asking somebody who already answered is worse than not asking.
 */
export function useReferralQuestion(enabled: boolean) {
  const [needed, setNeeded] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setNeeded(false);
      return;
    }
    let cancelled = false;
    getProfile()
      .then((profile) => {
        if (!cancelled) setNeeded(!profile?.referral_source);
      })
      .catch(() => {
        if (!cancelled) setNeeded(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  /**
   * A merge, so only these two fields change. The detail goes with `other`
   * alone: the API refuses it beside any other source.
   */
  const save = useCallback(async (source: ReferralSource, detail?: string) => {
    await upsertProfile({
      referral_source: source,
      ...(source === "other" && detail?.trim()
        ? { referral_source_detail: detail.trim() }
        : {}),
    });
    setNeeded(false);
  }, []);

  return { needed, save };
}
