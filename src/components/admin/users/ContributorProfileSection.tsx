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

  const list = (values: string[] | null | undefined) =>
    profiles === null ? NO_VALUE : values?.join(", ") || NO_VALUE;

  const languages = list(profile?.native_languages);
  const homeLanguages = list(profile?.home_languages);

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
      <DetailField label="Native languages" value={languages} />
      <DetailField label="Spoken at home" value={homeLanguages} />
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

const NEXT_ACTION_LABEL: Record<string, string> = {
  await_review: "Held for a person to review",
  create_account: "Needs a payout account",
  await_verification: "ID under review",
  verify_identity: "Needs to send an ID document",
  add_payout_destination: "Needs a bank account",
  complete_onboarding: "Needs to finish setting up",
  none: "Nothing outstanding",
};

/**
 * Whether this contributor can be paid, and what is in the way.
 *
 * An admin could see who somebody was and not whether their money could
 * move, which is the question they open this panel to answer.
 *
 * `identity_verified` is the condition, not `identity_status === "passed"`:
 * a document can pass and still be held because another account claims the
 * same NIN.
 *
 * `null` means no wallet yet, which is not started rather than failed, and
 * reads differently from a check that went wrong.
 */
export function IdentitySection({ profiles }: { profiles: ApiUserProfiles | null }) {
  if (profiles === null) return null;

  const identity = profiles.identity;

  if (!identity) {
    return (
      <DetailGroup title="Getting paid">
        <DetailField label="Status" value="Not started" span />
      </DetailGroup>
    );
  }

  return (
    <DetailGroup title="Getting paid">
      <DetailField
        label="Can be paid"
        value={identity.identity_verified ? "Yes" : "No"}
        tone={identity.identity_verified ? "accent" : "muted"}
      />
      <DetailField
        label="Next step"
        value={
          identity.next_action
            ? (NEXT_ACTION_LABEL[identity.next_action] ?? identity.next_action)
            : NO_VALUE
        }
      />
      {/* The same sentence the contributor reads on their own wallet, so an
          admin helping them is looking at the same thing. */}
      {identity.next_action_detail || identity.identity_failure_reason ? (
        <DetailField
          label="Detail"
          value={identity.next_action_detail ?? identity.identity_failure_reason ?? ""}
          span
        />
      ) : null}
    </DetailGroup>
  );
}
