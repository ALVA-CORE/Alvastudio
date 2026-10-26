import { useEffect, useState } from "react";
import { AlvaEmptyState } from "@/components/shared/states/AlvaEmptyState";
import { AdminStatusPill } from "@/components/admin/shared/AdminStatusPill";
import { ClipPlayer } from "@/components/admin/shared/ClipPlayer";
import { ClipPlayerSkeleton } from "@/components/admin/shared/ClipPlayerSkeleton";
import { DetailField, DetailGroup } from "@/components/admin/shared/detail";
import { getSession, sessionAudioUrl } from "@/lib/api/focusGroups";
import type { ApiParticipant } from "@/lib/api/focusGroups";
import { fromApiAgeBracket, fromApiGender, fromApiVariety } from "@/lib/api/enums";
import { NO_VALUE } from "@/lib/no-value";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";

/**
 * Who was in the room, and the recording itself.
 *
 * The panel used to show a speaker count and nothing else, on a surface whose
 * job is to check that a session was collected properly. Everything an intern
 * writes down at intake — who spoke, how old, which variety, whether they
 * agreed — reached the API and was never readable again by the person
 * approving the work.
 *
 * The audio is here for the same reason. An admin asked to judge whether a
 * session is usable had no way to listen to it, which left "Audio uploaded"
 * as the entire quality check.
 *
 * Consent leads each row because it is the one field that decides whether the
 * session can be annotated at all: a participant who has not agreed blocks
 * the whole file until they are recorded or redacted.
 */
export function SessionSpeakers({
  sessionId,
  hasAudio,
}: {
  sessionId: string;
  hasAudio: boolean;
}) {
  const [participants, setParticipants] = useState<ApiParticipant[] | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;

    setParticipants(null);
    setFailed(false);
    setAudioLoading(true);

    getSession(sessionId)
      .then((session) => {
        if (!cancelled) setParticipants(session.participants ?? []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    /* Authenticated, so it cannot be an `<audio src>`. */
    sessionAudioUrl(sessionId)
      .then((blobUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        url = blobUrl;
        setAudioUrl(blobUrl);
      })
      .catch(() => {
        if (!cancelled) setAudioUrl(null);
      })
      .finally(() => {
        if (!cancelled) setAudioLoading(false);
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [sessionId]);

  return (
    <>
      <section className="mt-6 border-t border-alva-border pt-6">
        <h3 className="text-sm font-medium text-foreground">The recording</h3>
        <div className="mt-3">
          {audioLoading ? (
            <ClipPlayerSkeleton />
          ) : audioUrl ? (
            <ClipPlayer src={audioUrl} />
          ) : hasAudio ? (
            /* There is a file; we could not fetch it. Said apart from "no
               audio", because the two call for different people to do
               different things. */
            <p className="text-xs text-destructive">
              The recording is there but could not be loaded.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              No audio on this session yet, so there is nothing to listen to.
            </p>
          )}
        </div>
      </section>

      {failed ? (
        <p role="alert" className="mt-6 text-xs text-destructive">
          The speakers could not be loaded.
        </p>
      ) : participants === null ? (
        <p className="mt-6 text-xs text-muted-foreground">Loading speakers.</p>
      ) : participants.length === 0 ? (
        <AlvaEmptyState
          className="mt-6"
          icon={<UsersGroupRounded size={20} weight="Outline" />}
          title="Nobody logged"
          description="The intern recorded this session without writing down who spoke."
        />
      ) : (
        participants.map((person) => (
          <DetailGroup
            key={person.id}
            title={person.label || "Unnamed speaker"}
          >
            <div className="col-span-2 -mt-1 mb-1">
              <AdminStatusPill tone={person.consent_given ? "good" : "bad"}>
                {person.consent_given
                  ? `Consent given${
                      person.consent_version ? `, v${person.consent_version}` : ""
                    }`
                  : "No consent on file"}
              </AdminStatusPill>
            </div>

            <DetailField
              label="Age"
              value={fromApiAgeBracket(person.age_bracket) || NO_VALUE}
            />
            <DetailField
              label="Gender"
              value={fromApiGender(person.gender) || NO_VALUE}
            />
            <DetailField label="State" value={person.state || NO_VALUE} />
            <DetailField
              label="Variety"
              value={fromApiVariety(person.language_variety) || NO_VALUE}
            />
            <DetailField
              label="Native language"
              value={person.native_language || NO_VALUE}
            />
            <DetailField label="Role" value={person.role || NO_VALUE} />
            {/* The number the intern took so somebody could be reached about
                their own recording, which is the only thing it is for. */}
            <DetailField label="Phone" value={person.phone || NO_VALUE} span />
          </DetailGroup>
        ))
      )}
    </>
  );
}
