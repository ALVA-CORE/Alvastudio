import {
  getUserProfiles,
  listUserProfilesPage,
  USER_PROFILES_MAX_LIMIT,
  type ApiUserProfiles,
} from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import { toCsv } from "@/lib/download-csv";
import {
  ROLE_LABELS,
  STATUS_LABEL,
  accountStatus,
  type AdminUser,
} from "@/data/admin/users";
import { REFERRAL_SOURCE_OPTIONS } from "@/data/contributors/onboarding";

/**
 * How many per-user requests run at once, on the fallback path only.
 *
 * Six keeps an export to seconds for a few hundred people without queueing
 * every other request on the page behind it.
 */
const CONCURRENCY = 6;

type Progress = (done: number, total: number) => void;

/**
 * Every account's profiles, keyed by user id.
 *
 * From `GET /users/profiles`, up to 500 a request. Only the role is passed
 * on, when the accounts in view share one: the page's status filter
 * (pending, waiting, active, deactivated) has no exact match among the
 * route's filters, so the rows are matched to `users` by id here instead.
 *
 * A person with no row back keeps their account columns and gets blank
 * profile columns, counted in `failed` so the caller can say so.
 *
 * An API without the bulk route (before 3 Nov) answers 404, as the path
 * reads as `/users/{id}` there. That falls back to one request per person.
 */
export async function fetchProfilesFor(
  users: AdminUser[],
  onProgress?: Progress
): Promise<{ profiles: Map<string, ApiUserProfiles>; failed: number }> {
  try {
    return await fetchInBulk(users, onProgress);
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 404 && !cause.unreachable) {
      return fetchOneByOne(users, onProgress);
    }
    throw cause;
  }
}

async function fetchInBulk(users: AdminUser[], onProgress?: Progress) {
  const wanted = new Set(users.map((user) => user.id));
  const roles = new Set(users.map((user) => user.role));
  const role = roles.size === 1 ? users[0]?.role : undefined;

  const profiles = new Map<string, ApiUserProfiles>();
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const page = await listUserProfilesPage({
      role,
      limit: USER_PROFILES_MAX_LIMIT,
      offset,
    });
    total = page.total;
    for (const row of page.items) {
      if (!wanted.has(row.user_id)) continue;
      const { email: _email, full_name: _name, is_active: _active, created_at: _at, ...rest } = row;
      profiles.set(row.user_id, { ...rest, identity: rest.identity ?? null });
    }
    /* Stop on `total`, or on an empty page whatever `total` says. */
    if (page.items.length === 0) break;
    offset += page.items.length;
    onProgress?.(Math.min(offset, total), total);
  }

  return { profiles, failed: users.length - profiles.size };
}

async function fetchOneByOne(users: AdminUser[], onProgress?: Progress) {
  const profiles = new Map<string, ApiUserProfiles>();
  let failed = 0;
  let done = 0;
  let next = 0;

  const worker = async () => {
    while (next < users.length) {
      const user = users[next];
      next += 1;
      try {
        profiles.set(user.id, await getUserProfiles(user.id));
      } catch {
        failed += 1;
      }
      done += 1;
      onProgress?.(done, users.length);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, users.length) }, worker)
  );
  return { profiles, failed };
}

/** `25_34` → `25-34`, `65_plus` → `65+`. The API's own buckets, unfolded. */
function ageBracket(value: string | null | undefined) {
  if (!value) return "";
  if (value === "under_18") return "Under 18";
  return value.replace("_plus", "+").replace("_", "-");
}

/** Enum values read as words: `nigerian_pidgin` → `nigerian pidgin`. */
function words(value: string | null | undefined) {
  return value ? value.replace(/_/g, " ") : "";
}

/** Lists in one cell, split on "; " so commas inside an entry survive. */
function list(values: string[] | null | undefined) {
  return (values ?? []).join("; ");
}

function referralLabel(value: string | null | undefined) {
  if (!value) return "";
  return REFERRAL_SOURCE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

const HEADER = [
  // Account
  "full_name",
  "email",
  "phone",
  "role",
  "status",
  "joined",
  // Onboarding profile (contributors, and anyone else who filled it in)
  "age_bracket",
  "gender",
  "state_of_origin",
  "state_of_residence",
  "primary_residence_region",
  "accent_influence_region",
  "ethnicity",
  "occupation",
  "native_languages",
  "home_languages",
  "pidgin_fluency",
  "english_fluency",
  "preferred_variety",
  "device_mic",
  "heard_about_us",
  "heard_about_us_detail",
  // Interns
  "intern_primary_state",
  "intern_coverage_areas",
  // Annotators
  "annotator_varieties",
  "annotator_sessions_covered",
  // Payouts. Status only: no part of the NIN is ever in the response.
  "identity_verified",
  "identity_status",
  "wallet_status",
];

/**
 * One row per account with everything we hold on them.
 *
 * Wide on purpose: an admin filters it in a spreadsheet, and one sheet with
 * blank cells beats a sheet per role that has to be joined back together.
 */
export function usersToCsv(
  users: AdminUser[],
  profiles: Map<string, ApiUserProfiles>
) {
  return toCsv(
    HEADER,
    users.map((user) => {
      const all = profiles.get(user.id);
      const p = all?.profile;
      const intern = all?.intern_profile;
      const annotator = all?.annotator_profile;
      const identity = all?.identity;

      return [
        user.fullName,
        user.email,
        user.phone,
        ROLE_LABELS[user.role] ?? user.role,
        STATUS_LABEL[accountStatus(user)],
        new Date(user.createdAt).toISOString().slice(0, 10),

        ageBracket(p?.age_bracket),
        words(p?.gender),
        p?.state_of_origin,
        p?.state_of_residence,
        p?.primary_residence_region,
        p?.accent_influence_region,
        p?.ethnicity,
        p?.occupation,
        list(p?.native_languages),
        list(p?.home_languages),
        words(p?.pidgin_fluency),
        words(p?.english_fluency),
        words(p?.preferred_language_variety),
        p?.device_mic,
        referralLabel(p?.referral_source),
        p?.referral_source_detail,

        intern?.primary_state,
        list(intern?.coverage_areas),

        list(annotator?.language_varieties?.map(words)),
        list(annotator?.sessions_covered),

        identity ? (identity.identity_verified ? "yes" : "no") : "",
        words(identity?.identity_status),
        words(identity?.wallet_status),
      ];
    })
  );
}
