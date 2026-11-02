import { getUserProfiles, type ApiUserProfiles } from "@/lib/api/users";
import { toCsv } from "@/lib/download-csv";
import {
  ROLE_LABELS,
  STATUS_LABEL,
  accountStatus,
  type AdminUser,
} from "@/data/admin/users";
import { REFERRAL_SOURCE_OPTIONS } from "@/data/contributors/onboarding";

/**
 * How many profile requests run at once.
 *
 * There is no bulk route (endpoints-needed #3), so an export is one
 * `GET /users/{id}/profiles` per person. Six keeps it to seconds for a few
 * hundred people without queueing every other request on the page behind it.
 */
const CONCURRENCY = 6;

/**
 * Every account's profiles, keyed by user id.
 *
 * A request that fails leaves that person out of the map rather than failing
 * the export. Their account row still goes out, with blank profile columns,
 * and the caller reports how many came back empty.
 */
export async function fetchProfilesFor(
  users: AdminUser[],
  onProgress?: (done: number) => void
): Promise<{ profiles: Map<string, ApiUserProfiles>; failed: number }> {
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
      onProgress?.(done);
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
