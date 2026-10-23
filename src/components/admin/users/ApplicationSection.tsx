import { DetailGroup, DetailField } from "@/components/admin/shared/detail";
import type { ApiUserProfiles } from "@/lib/api/users";
import { fromApiVariety } from "@/lib/api/enums";
import { NO_VALUE } from "@/lib/no-value";
import type { AdminUser } from "@/data/admin/users";

/**
 * What the applicant said about themselves, for the admin approving them.
 *
 * Approving used to be a decision made on a name and a role. The claim is the
 * thing being approved — which varieties somebody says they can tag, which
 * area they say they cover — so it belongs beside the button rather than a
 * page away.
 *
 * Only for people still waiting. Once approved it is their profile, readable
 * where profiles are read, and repeating it here would imply the decision is
 * still open.
 */
export function ApplicationSection({
  user,
  profiles,
}: {
  user: AdminUser;
  profiles: ApiUserProfiles | null;
}) {
  const annotator = profiles?.annotator_profile;
  const intern = profiles?.intern_profile;

  /* Loading reads as a dash rather than a spinner: this sits inside a panel
     that is already open, and two rows flickering is worse than two dashes
     that fill in. */
  const pending = profiles === null;

  const list = (values: string[] | null | undefined, map?: (value: string) => string) => {
    if (pending) return NO_VALUE;
    const entries = (values ?? []).map((value) => map?.(value) ?? value).filter(Boolean);
    return entries.length ? entries.join(", ") : "Not stated";
  };

  return (
    <DetailGroup title="What they applied with">
      {user.role === "annotator" ? (
        <>
          <DetailField
            label="Varieties they can tag"
            value={list(annotator?.language_varieties, (value) =>
              fromApiVariety(value) || value
            )}
          />
          <DetailField
            label="Sessions they cover"
            value={list(annotator?.sessions_covered)}
          />
        </>
      ) : (
        <>
          <DetailField
            label="Primary state"
            value={pending ? NO_VALUE : (intern?.primary_state || "Not stated")}
          />
          <DetailField
            label="Coverage areas"
            value={list(intern?.coverage_areas)}
          />
        </>
      )}
    </DetailGroup>
  );
}
