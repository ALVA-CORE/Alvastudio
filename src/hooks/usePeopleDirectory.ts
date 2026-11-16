import { useCallback, useEffect, useState } from "react";
import { listUserProfilesPage, USER_PROFILES_MAX_LIMIT, type ApiUserRole } from "@/lib/api/users";
import { reportApiError } from "@/lib/api/reportApiError";
import { NIGERIAN_STATES } from "@/data/interns/participants";

export type DirectoryRole = Exclude<ApiUserRole, "admin">;

export type DirectoryPerson = {
  id: string;
  name: string;
  email: string;
  role: DirectoryRole;
  /** Canonical state name, or null when blank or unrecognised. Contributors only. */
  stateOfOrigin: string | null;
  stateOfResidence: string | null;
  /**
   * A contributor: false while on the waiting list, and still emailed. An
   * intern or annotator: false while their signup waits, and left out of
   * their group (but can still be chosen by name).
   */
  approved: boolean;
};

const ROLES: DirectoryRole[] = ["contributor", "intern", "annotator"];

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
 * Every active contributor, intern and annotator, for the recipient picker.
 * Contributors carry the states they gave.
 *
 * From `GET /users/profiles`, 500 a request, so a few thousand people is a
 * few requests. Inactive accounts are dropped here, because the send route
 * refuses them. The waiting list stays: the API mails them too, and leaving
 * them out unasked would be a decision nobody made.
 */
export function usePeopleDirectory(enabled = true) {
  const [people, setPeople] = useState<DirectoryPerson[]>([]);
  const [isLoading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);

    const loadRole = async (role: DirectoryRole) => {
      const rows: DirectoryPerson[] = [];
      let offset = 0;
      let total = Infinity;
      while (offset < total) {
        const page = await listUserProfilesPage({
          role,
          limit: USER_PROFILES_MAX_LIMIT,
          offset,
        });
        total = page.total;
        if (page.items.length === 0) break;
        offset += page.items.length;
        for (const row of page.items) {
          if (!row.is_active) continue;
          /* A state reaches contributors only (15 Nov), so nobody else
             carries one. */
          const contributor = role === "contributor";
          rows.push({
            id: row.user_id,
            name: row.full_name,
            email: row.email,
            role,
            stateOfOrigin: contributor ? canonicalState(row.profile?.state_of_origin) : null,
            stateOfResidence: contributor ? canonicalState(row.profile?.state_of_residence) : null,
            approved: row.approved,
          });
        }
      }
      return rows;
    };

    const load = async () =>
      (await Promise.all(ROLES.map(loadRole))).flat().sort((a, b) => a.name.localeCompare(b.name));

    load()
      .then((rows) => {
        if (cancelled) return;
        setPeople(rows);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load people."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return { people, isLoading, error, reload };
}
