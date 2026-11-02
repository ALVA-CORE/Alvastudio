import {
  REFERRAL_SOURCE_SHORT_LABEL,
  type ReferralSource,
} from "@/data/contributors/onboarding";

export type ReferralSlice = { source: string; label: string; contributors: number };

/**
 * `{source: count}` from the API, as wedges largest first.
 *
 * Sorted so the eye goes round from the biggest channel. Sources nobody
 * picked are dropped, because a ring of fifteen wedges with eleven empty is
 * mostly gap. `unknown` holds everyone who signed up before the question
 * existed. It is real but it is not a channel, so it is kept off the chart
 * and the card says how many there are instead.
 */
export function toReferralSlices(record: Record<string, number> | undefined): ReferralSlice[] {
  return Object.entries(record ?? {})
    .filter(([source, count]) => source !== "unknown" && count > 0)
    .map(([source, count]) => ({
      source,
      label: REFERRAL_SOURCE_SHORT_LABEL[source as ReferralSource] ?? source.replace(/_/g, " "),
      contributors: count,
    }))
    .sort((a, b) => b.contributors - a.contributors);
}
