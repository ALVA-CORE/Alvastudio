import { useEffect, useState } from "react";
import { PanelRow } from "@/components/shared/PanelPrimitives";
import { listConsents, recordConsent } from "@/lib/api/onboarding";
import type { ApiConsent } from "@/lib/api/onboarding";
import type { ApiConsentType } from "@/lib/api/enums";
import { NO_VALUE } from "@/lib/no-value";

/**
 * Consent is append-only: a change of mind is a new record, so the latest one
 * of a type is the answer and anything before it is history.
 */
function latestOf(consents: ApiConsent[], type: ApiConsentType) {
  return consents
    .filter((consent) => consent.consent_type === type)
    .sort((a, b) => a.accepted_at.localeCompare(b.accepted_at))
    .at(-1);
}

/**
 * What the annotator has agreed to, and the one thing they can change.
 *
 * Both rows come from `GET /onboarding/consent`. The two statements beside
 * them on this sheet — that audio cannot be exported, and that participant
 * identifiers are masked — are facts about how the product is built rather
 * than settings on this account, which is why they are written as sentences
 * and have no control next to them.
 *
 * The activity log records how an annotation was built so an admin can replay
 * it, which makes it monitoring data about a person's work. Nothing is
 * recorded until they turn it on, and turning it off stops it: the API refuses
 * the writes either way, so this switch is the control rather than a hint to
 * one.
 *
 * It lives here rather than in the workspace on purpose. A consent prompt in
 * front of the editor is a prompt somebody dismisses to get to work, which is
 * not consent; here it is theirs to find, read and change whenever they like.
 *
 * The activity log is on and cannot be turned off.
 *
 * It was a switch, defaulting on. It is now a condition of the work, so this
 * says so instead of offering a choice that is not there. An annotator with
 * no record yet has one written for them the first time this loads.
 *
 * The copy matters because of that: it does not call itself consent or thank
 * anybody for agreeing. It states what is recorded, for how long, and who can
 * read it, which is what somebody is owed when they have no say.
 */
export function PrivacyRows() {
  const [consents, setConsents] = useState<ApiConsent[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    listConsents()
      .then(async (rows) => {
        if (cancelled) return;

        /* No record at all means they have never been asked, not that they
         * said no. The default is on, so it is written now — once, and only
         * when nothing is on file. A withdrawal is a record saying `false`,
         * which this leaves alone. */
        if (!latestOf(rows, "annotation_activity_log")) {
          try {
            const saved = await recordConsent({
              consent_type: "annotation_activity_log",
              accepted: true,
            });
            if (!cancelled) setConsents([...rows, saved]);
            return;
          } catch {
            /* Falls through to the rows we have: the switch then shows off,
             * which is what the API will enforce anyway. */
          }
        }

        if (!cancelled) setConsents(rows);
      })
      .catch(() => {
        if (!cancelled) setConsents([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);


  const ndpa = consents ? latestOf(consents, "ndpa_data_use") : undefined;

  return (
    <>
      <PanelRow
        label="Data use agreement"
        value={
          consents === null
            ? NO_VALUE
            : ndpa?.accepted
              ? `Accepted, v${ndpa.policy_version}`
              : "Not accepted"
        }
      />

      <PanelRow label="Activity log" value="Always on" />

      <div className="pt-2 text-xs leading-relaxed text-muted-foreground">
        Which segments you create, retime and tag is recorded, so an admin can
        see how a session was annotated. No transcript text is stored, only
        which segment changed and how long it became. Records are deleted after
        90 days, and only you and an admin can read them.
      </div>
    </>
  );
}
