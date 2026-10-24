import { useEffect, useState } from "react";
import ShieldWarning from "@solar-icons/react/security/ShieldWarning";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AlvaToggle } from "@/components/shared/AlvaToggle";
import { TextureButton } from "@/components/ui/texture-button";
import { getSession, setParticipantConsent } from "@/lib/api/focusGroups";
import type { ApiParticipant } from "@/lib/api/focusGroups";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";

/**
 * The take cannot be saved: somebody in the room has not agreed.
 *
 * The API refuses the upload, and it is right to — a session is a recording of
 * people, and one of them said no or was never asked.
 *
 * Until today there was nothing to do about it: consent could not be amended
 * and a participant could not be removed, so the only path was logging the
 * session again and throwing the recording away. `PATCH .../participants/{id}`
 * closes that, so this sheet now records the decision rather than describing
 * the problem.
 *
 * It asks rather than assumes. A switch per person, defaulting to off, so
 * nobody is marked as agreeing by the act of opening this.
 */
export function ConsentBlockedSheet({
  open,
  onOpenChange,
  sessionId,
  onResolved,
  onRemoveFromRecording,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  /** Called once everybody has agreed, so the caller can retry the upload. */
  onResolved: () => void;
  /**
   * Somebody withdrew for good and has to come out of the recording.
   *
   * The other half of this problem: a switch is for agreement that was given
   * and never logged, and this is for a refusal that stands.
   */
  onRemoveFromRecording?: (participant: ApiParticipant) => void;
}) {
  const [people, setPeople] = useState<ApiParticipant[] | null>(null);
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !sessionId) return;

    let cancelled = false;
    setPeople(null);
    setAgreed({});
    setError(null);

    getSession(sessionId)
      .then((session) => {
        if (cancelled) return;
        setPeople((session.participants ?? []).filter((p) => !p.consent_given));
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not read the session."));
      });

    return () => {
      cancelled = true;
    };
  }, [open, sessionId]);

  const missing = people ?? [];
  const ready = missing.length > 0 && missing.every((person) => agreed[person.id]);

  const save = async () => {
    if (!sessionId) return;

    setSaving(true);
    setError(null);

    try {
      /* One at a time, in order. A batch would be one request, but a partial
         failure in a batch leaves nobody knowing which of them landed. */
      for (const person of missing) {
        await setParticipantConsent(sessionId, person.id, { consent_given: true });
      }

      alvaToast.success("Consent recorded. Saving your take.");
      onResolved();
    } catch (cause) {
      const message = reportApiError(cause, "Could not record that.");
      setError(message ?? "Could not record that.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="rounded-t-[28px] border-alva-border bg-alva-card px-5 pb-8 pt-7"
      >
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="flex items-center gap-2 text-xl text-foreground">
            <ShieldWarning size={22} weight="BoldDuotone" className="text-amber-300" />
            Not everyone has agreed
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            A session cannot be saved until everyone in the room has agreed to
            take part. Confirm each person below only if they actually agreed.
          </p>

          <div className="space-y-1">
            {people === null ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Checking who is missing…
              </p>
            ) : (
              missing.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-alva-surface px-4 py-2.5"
                >
                  <span className="min-w-0 truncate text-sm text-foreground">
                    {person.label}
                  </span>
                  <AlvaToggle
                    checked={agreed[person.id] ?? false}
                    onCheckedChange={(next) =>
                      setAgreed((prev) => ({ ...prev, [person.id]: next }))
                    }
                    aria-label={`${person.label} agreed`}
                  />
                </div>
              ))
            )}
          </div>

          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}

          {onRemoveFromRecording && missing.length > 0 ? (
            <div className="rounded-2xl bg-alva-surface px-4 py-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                If somebody genuinely withdrew, their turns can be cut out of
                the recording and the rest of the session kept.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {missing.map((person) => (
                  <TextureButton
                    key={person.id}
                    variant="minimal"
                    size="sm"
                    className="w-auto"
                    onClick={() => onRemoveFromRecording(person)}
                  >
                    Remove {person.label}
                  </TextureButton>
                ))}
              </div>
            </div>
          ) : null}

          <p className="text-xs leading-relaxed text-muted-foreground">
            Your take is still here, and nothing has been uploaded.
          </p>

          <div className="flex items-center gap-2">
            <TextureButton
              variant="minimal"
              size="lg"
              className="w-auto"
              onClick={() => onOpenChange(false)}
            >
              Back
            </TextureButton>

            <TextureButton
              variant="alva"
              size="lg"
              disabled={!ready}
              loading={saving}
              onClick={() => void save()}
            >
              Record and save
            </TextureButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
