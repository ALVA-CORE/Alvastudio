import { useEffect, useState } from "react";
import { getUserProfiles, type ApiUserProfiles } from "@/lib/api/users";

/**
 * What a person submitted, for the admin looking at them.
 *
 * One request for the panel rather than one per section: the response carries
 * the contributor profile, the intern profile and the annotator profile
 * together, and two sections asking for the same thing would be two.
 *
 * Null while in flight and on failure both. A panel that is already open
 * showing dashes is better than one that throws a banner over the account
 * details somebody came to read.
 */
export function useUserProfiles(userId: string | undefined) {
  const [profiles, setProfiles] = useState<ApiUserProfiles | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    setProfiles(null);

    getUserProfiles(userId)
      .then((result) => {
        if (!cancelled) setProfiles(result);
      })
      .catch(() => {
        if (!cancelled) setProfiles(null);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return profiles;
}
