import { DetailField, DetailGroup } from "@/components/admin/shared/detail";
import {
  fromApiAgeBracket,
  fromApiFluency,
  fromApiGender,
  fromApiVariety,
} from "@/lib/api/enums";
import { NO_VALUE } from "@/lib/no-value";
import type { ApiUserProfiles } from "@/lib/api/users";

const GENDER_LABEL: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  "prefer-not-to-say": "Prefer not to say",
  prefer_not_to_say: "Prefer not to say",
};

/**
 * What a contributor told us about themselves at sign-up.
 *
 * All of it, not a sample. The panel used to show the account facts only, so
 * an admin looking at a contributor could see their email and the date they
 * joined but not the demographic answers the whole corpus is sorted by, which
 * is the thing they would actually be looking for.
 *
 * `null` from the API is "never answered" and shows as a dash. That is
 * different from "prefer not to say", which is an answer and reads as one.
 */
export function ContributorProfileSection({
  profiles,
}: {
  profiles: ApiUserProfiles | null;
}) {
  const profile = profiles?.profile;

  /* Pending reads as a dash rather than a spinner: the panel is already open
     and a column of rows flickering is worse than one that fills in. */
  const text = (value: string | null | undefined) =>
    profiles === null ? NO_VALUE : value || NO_VALUE;

  const languages = profiles === null
    ? NO_VALUE
    : (profile?.native_languages ?? []).join(", ") || NO_VALUE;

  return (
    <DetailGroup title="What they told us">
      <DetailField label="Age" value={text(fromApiAgeBracket(profile?.age_bracket))} />
      <DetailField
        label="Gender"
        value={text(profile?.gender ? GENDER_LABEL[profile.gender] ?? fromApiGender(profile.gender) : "")}
      />
      <DetailField label="State of origin" value={text(profile?.state_of_origin)} />
      <DetailField label="State of residence" value={text(profile?.state_of_residence)} />
      <DetailField label="Ethnicity" value={text(profile?.ethnicity)} />
      <DetailField label="Occupation" value={text(profile?.occupation)} />
      <DetailField label="Native languages" value={languages} span />
      <DetailField
        label="Pidgin fluency"
        value={text(fromApiFluency(profile?.pidgin_fluency))}
      />
      <DetailField
        label="English fluency"
        value={text(fromApiFluency(profile?.english_fluency))}
      />
      <DetailField
        label="Records in"
        value={text(fromApiVariety(profile?.preferred_language_variety))}
      />
      <DetailField label="Microphone" value={text(profile?.device_mic)} />
    </DetailGroup>
  );
}
