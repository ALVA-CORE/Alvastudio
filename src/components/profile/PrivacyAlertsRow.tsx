import { useEffect, useState } from "react";
import ShieldCheck from "@solar-icons/react/security/ShieldCheck";
import type { ReactNode } from "react";
import { ProfileActionRow } from "@/components/profile/ProfileActionRow";
import { ProfileInfoBlock } from "@/components/profile/ProfileInfoBlock";
import { listConsents, type ApiConsent } from "@/lib/api/onboarding";
import type { ApiConsentType } from "@/lib/api/enums";
import { NO_VALUE } from "@/lib/no-value";

/**
 * Consent is append-only: a change of mind is a new record, so the latest of
 * a type is the answer and anything before it is history.
 */
function latestOf(consents: ApiConsent[], type: ApiConsentType) {
  return consents
    .filter((consent) => consent.consent_type === type)
    .sort((a, b) => a.accepted_at.localeCompare(b.accepted_at))
    .at(-1);
}

/**
 * What they agreed to, and what reaches them. One row, on every role.
 *
 * It was two: "Consent & privacy" and "Notifications". Both were short, both
 * answered the same question — what does Alva do with me and when does it
 * get in touch — and splitting them meant two taps to read eight lines.
 *
 * The consent rows are real, from `GET /onboarding/consent`. The alert rows
 * are deliberately statements rather than switches: there is nothing on the
 * API to turn a notification off, and a toggle that silently controls nothing
 * is worse than a sentence that says how it works. "Review updates: On" was
 * exactly that, and it was written into the page as a string.
 */
export function PrivacyAlertsRow({
  children,
  alerts,
  hideDivider,
}: {
  /** Role-specific rows, shown under the consent records. */
  children?: ReactNode;
  /** What the bell carries for this role, in their words. */
  alerts: string[];
  hideDivider?: boolean;
}) {
  const [consents, setConsents] = useState<ApiConsent[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    listConsents()
      .then((rows) => {
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
    <ProfileActionRow
      icon={<ShieldCheck size={20} weight="Outline" />}
      /* Two words, and it has to cover consent, what is recorded, and what
         reaches them. "Consent & privacy" named half of it. */
      title="Privacy & alerts"
      sheetTitle="Privacy & alerts"
      hideDivider={hideDivider}
    >
      <dl>
        <ProfileInfoBlock
          label="Data use agreement"
          value={
            consents === null
              ? NO_VALUE
              : ndpa?.accepted
                ? `Accepted, v${ndpa.policy_version}`
                : "Not accepted"
          }
        />
        <ProfileInfoBlock
          label="Agreed on"
          value={
            consents === null
              ? NO_VALUE
              : ndpa
                ? new Date(ndpa.accepted_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Not yet"
          }
        />
      </dl>

      {children}

      {/* Sentences, not switches. Nothing on the API turns any of these off,
          and a control that does nothing is a lie with an affordance. */}
      <p className="mb-2 mt-6 text-xs text-muted-foreground">What you will hear about</p>
      <ul className="space-y-1.5">
        {alerts.map((alert) => (
          <li key={alert} className="text-sm leading-relaxed text-foreground">
            {alert}
          </li>
        ))}
      </ul>
    </ProfileActionRow>
  );
}
