import { useEffect, useState } from "react";
import { PanelRow } from "@/components/shared/PanelPrimitives";
import { TextureButton } from "@/components/ui/texture-button";
import { listConsents, recordConsent } from "@/lib/api/onboarding";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";

/**
 * The annotator's own switch on the activity log.
 *
 * The log records how an annotation was built so an admin can replay it, which
 * makes it monitoring data about a person's work. Nothing is recorded until
 * they turn this on, and turning it off stops it — the API refuses the writes
 * either way, so this is the control, not a hint to one.
 *
 * It lives on the profile rather than in the workspace on purpose. A consent
 * prompt in front of the editor is a prompt somebody dismisses to get to work,
 * which is not consent; here it is theirs to find, read and change whenever
 * they like.
 *
 * Off is the default, including while this is still loading, because the
 * honest thing to show about a permission nobody has granted yet is "off".
 */
export function ActivityLogConsent() {
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [isSaving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    listConsents()
      .then((consents) => {
        if (cancelled) return;
        /* Append-only: a change of mind is a new record, so the last one for
         * this type is the answer. */
        const latest = consents
          .filter((consent) => consent.consent_type === "annotation_activity_log")
          .sort((a, b) => a.accepted_at.localeCompare(b.accepted_at))
          .at(-1);
        setAccepted(latest?.accepted ?? false);
      })
      .catch(() => {
        if (!cancelled) setAccepted(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const change = async (next: boolean) => {
    setSaving(true);
    try {
      await recordConsent({ consent_type: "annotation_activity_log", accepted: next });
      setAccepted(next);
      alvaToast.success(
        next ? "Activity log turned on." : "Activity log turned off."
      );
    } catch (cause) {
      const message = reportApiError(cause, "Could not save that.");
      if (message) alvaToast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const isOn = accepted === true;

  return (
    <>
      <PanelRow
        label="Activity log"
        value={
          <TextureButton
            variant={isOn ? "secondary" : "accent"}
            size="sm"
            className="w-auto px-3"
            disabled={accepted === null || isSaving}
            onClick={() => void change(!isOn)}
          >
            {isOn ? "Turn off" : "Turn on"}
          </TextureButton>
        }
      />
      <div className="pt-2 text-xs leading-relaxed text-muted-foreground">
        {isOn
          ? "Your edits are recorded so an admin can see how a session was annotated. No transcript text is stored, only which segment changed and how long it became. Records are deleted after 90 days, and only you and an admin can read them."
          : "Off. Nothing about how you work is recorded. Turning it on stores which segments you create, retime and tag, so an admin can replay a session. No transcript text is kept, and records are deleted after 90 days."}
      </div>
    </>
  );
}
