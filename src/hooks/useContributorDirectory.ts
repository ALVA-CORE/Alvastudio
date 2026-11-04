import { useCallback, useEffect, useState } from "react";
import { listUserProfilesPage, USER_PROFILES_MAX_LIMIT } from "@/lib/api/users";
import { reportApiError } from "@/lib/api/reportApiError";
import { NIGERIAN_STATES } from "@/data/interns/participants";

export type DirectoryContributor = {
  id: string;
  name: string;
  email: string;
  /** Canonical state name, or null when blank or unrecognised. */
  stateOfOrigin: string | null;
  stateOfResidence: string | null;
  /** False while on the waiting list. They still receive email. */
  approved: boolean;
};

const CANONICAL = new Map<string, string>(
  NIGERIAN_STATES.map((state) => [state.toLowerCase(), state])
);

/**
 * Free text to one of the 36 states and the FCT.
 *
 * State is typed, not picked, so "Lagos", "lagos" and "Lagos State" are one
 * state, as the API's coverage map already treats them. Anything that matches
 * nothing is left out of the state filter rather than guessed at.
 */
export function canonicalState(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = value
    .trim()
    .toLowerCase()
    .replace(/\s+state$/, "")
    .replace(/\s+/g, " ");
  if (!key) return null;
  if (key === "abuja" || key === "federal capital territory" || key === "f.c.t") return "FCT";
  if (key === "akwa-ibom") return "Akwa Ibom";
  if (key === "cross-river") return "Cross River";
  return CANONICAL.get(key) ?? null;
}

/**
 * Every active contributor, with the states they gave, for the recipient
 * picker.
 *
 * From `GET /users/profiles`, 500 a request, so a few thousand people is a
 * few requests. Inactive accounts are dropped here, because the send route
 * refuses them. The waiting list stays: the API mails them too, and leaving
 * them out unasked would be a decision nobody made.
 */
export function useContributorDirectory(enabled = true) {
  const [contributors, setContributors] = useState<DirectoryContributor[]>([]);
  const [isLoading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      const rows: DirectoryContributor[] = [];
      let offset = 0;
      let total = Infinity;
      while (offset < total) {
        const page = await listUserProfilesPage({
          role: "contributor",
          limit: USER_PROFILES_MAX_LIMIT,
          offset,
        });
        total = page.total;
        if (page.items.length === 0) break;
        offset += page.items.length;
        for (const row of page.items) {
          if (!row.is_active) continue;
          rows.push({
            id: row.user_id,
            name: row.full_name,
            email: row.email,
            stateOfOrigin: canonicalState(row.profile?.state_of_origin),
            stateOfResidence: canonicalState(row.profile?.state_of_residence),
            approved: row.approved,
          });
        }
      }
      return rows.sort((a, b) => a.name.localeCompare(b.name));
    };

    load()
      .then((rows) => {
        if (cancelled) return;
        setContributors(rows);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load contributors."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return { contributors, isLoading, error, reload };
}
