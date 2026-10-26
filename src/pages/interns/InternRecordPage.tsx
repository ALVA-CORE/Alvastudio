import { useEffect, useMemo, useState } from "react";
import Diskette from "@solar-icons/react/devices/Diskette";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import Stop from "@solar-icons/react/video/Stop";
import Play from "@solar-icons/react/video/Play";
import ClipboardCheck from "@solar-icons/react/notes/ClipboardCheck";
import { attachSessionAudio } from "@/hooks/useFocusGroups";
import { useFocusGroupTopics } from "@/hooks/useFocusGroupTopics";
import { ApiError } from "@/lib/api/client";
import { useStudioRecorder } from "@/hooks/useStudioRecorder";
import { alvaToast } from "@/lib/alva-toast";
import { AlvaEmptyState } from "@/components/shared/states/AlvaEmptyState";
import { StudioPromptStackSkeleton } from "@/components/contributors/studio/StudioPromptStackSkeleton";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { ParticipantIntakeModal } from "@/components/interns/participants/ParticipantIntakeModal";
import { ConsentBlockedSheet } from "@/components/interns/participants/ConsentBlockedSheet";
import { RedactParticipantSheet } from "@/components/interns/participants/RedactParticipantSheet";
import type { ApiParticipant } from "@/lib/api/focusGroups";
import { StudioProgress } from "@/components/contributors/studio/StudioProgress";
import { StudioPromptStack, type PromptCard } from "@/components/contributors/studio/StudioPromptStack";
import { StudioSiriControl } from "@/components/contributors/studio/StudioSiriControl";
import { StudioTakeActions } from "@/components/contributors/studio/StudioTakeActions";
import { StudioVoiceBeam } from "@/components/contributors/studio/StudioVoiceBeam";

function toCards(items: { id: string; text: string }[]): PromptCard[] {
  return items.map((item) => ({ id: item.id, prompt: item.text }));
}

export default function InternRecordPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  /* The session the intake modal created. Its id is what the take uploads
   * against, so there is no recording without it — which is also why the
   * primary button opens intake first. */
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [isSaving, setSaving] = useState(false);
  /** True once an upload was refused for consent. */
  const [consentBlocked, setConsentBlocked] = useState(false);
  const [redacting, setRedacting] = useState<ApiParticipant | null>(null);
  const recorder = useStudioRecorder();

  const { topics, isLoading: loadingTopics, error: topicsError } = useFocusGroupTopics();

  const items = useMemo(() => toCards(topics), [topics]);
  const total = items.length;

  /* A take in progress, or one recorded and not yet saved. Moving card
   * discards the recording, so the stack is locked until they finish, retake
   * or save: losing audio somebody just spoke to a stray arrow press is the
   * one mistake this page can make that cannot be undone. */
  const recordingInProgress = recorder.phase !== "idle";

  const goTo = (updater: (prev: number) => number) => {
    if (total === 0 || recordingInProgress) return;
    setCurrentIndex((prev) => (updater(prev) + total) % total);
    recorder.discardRecording();
  };

  const handlePrimary = async () => {
    if (!sessionId && recorder.phase === "idle") {
      setIntakeOpen(true);
      return;
    }

    if (recorder.phase === "idle") {
      await recorder.startRecording();
      alvaToast.accent("Recording started", <Microphone3 size={14} weight="Bold" />);
      return;
    }
    /* The blob pauses now. Stop is the button beside it, so the one control
       no longer means "start" and "end" depending on when you press it. */
    if (recorder.phase === "recording") {
      recorder.pauseRecording();
      return;
    }
    if (recorder.phase === "paused") {
      recorder.resumeRecording();
      return;
    }
    if (recorder.phase === "recorded" || recorder.phase === "playing") {
      await recorder.playRecording();
      alvaToast.show("Playing your take", {
        variant: "default",
        icon: <Play size={14} weight="Bold" />,
      });
    }
  };

  const handleStop = () => {
    recorder.stopRecording();
    alvaToast.success("Take saved, tap play to review", <Stop size={14} weight="Bold" />);
  };

  const handleRetake = () => {
    recorder.discardRecording();
    alvaToast.show("Take cleared, ready to record again");
  };

  /**
   * Attaching the audio is what makes the session real.
   *
   * Until a file is uploaded the session does not appear in
   * `/annotations/queue`, so an intern who records and never saves has created
   * nothing an annotator can pick up.
   */
  const handleSave = async () => {
    const blob = recorder.getBlob();
    if (!blob) {
      alvaToast.error("Record a take first");
      return;
    }
    if (!sessionId) {
      alvaToast.error("Log the session participants before saving");
      return;
    }

    setSaving(true);
    try {
      await attachSessionAudio(sessionId, blob, recorder.getDuration());
      alvaToast.success(
        "Focus group session submitted",
        <Diskette size={14} weight="Bold" />
      );
      /* The session now has its audio; a second take would replace it, so the
       * page starts a fresh session rather than reusing this one. */
      setSessionId(null);
      recorder.discardRecording();
      goTo((prev) => prev + 1);
    } catch (cause) {
      /* 409 here is the consent gate: somebody in the room has not agreed, so
       * the session cannot be processed. It needs more than a toast, because
       * nothing the intern can tap from here fixes it. */
      if (cause instanceof ApiError && cause.status === 409) {
        setConsentBlocked(true);
        return;
      }

      alvaToast.error(
        cause instanceof ApiError ? cause.message : "Could not upload the session."
      );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (recorder.error) {
      alvaToast.error(recorder.error);
    }
  }, [recorder.error]);

  return (
    <>
      <DesktopPageShell className="py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-foreground">Record focus group</h1>
        </div>

        <StudioProgress
          current={total ? currentIndex + 1 : 0}
          total={total}
          label={loadingTopics ? "Loading…" : total ? "Session progress" : "No topics"}
        />

        {loadingTopics ? (
          <StudioPromptStackSkeleton className="mt-8" />
        ) : topicsError ? (
          <p role="alert" className="mt-8 text-center text-sm text-destructive">
            {topicsError}
          </p>
        ) : total === 0 ? (
          /* The bank is curated by an admin, so an empty one is a message for
             them rather than something an intern can fix from here. */
          <AlvaEmptyState
            className="mt-6"
            icon={<ClipboardCheck size={20} weight="Outline" />}
            title="No topics yet"
            description="An admin adds focus group topics on the prompts page. Nothing can be recorded until there is one."
          />
        ) : (
          <StudioPromptStack
            className="mt-8"
            items={items}
            current={currentIndex}
            /* A focus group topic is a conversation to open, not a line to
               read: the intern leads, the room talks. */
            hint="and open the discussion"
            locked={recordingInProgress}
            onNext={() => goTo((prev) => prev + 1)}
            onPrevious={() => goTo((prev) => prev - 1)}
          />
        )}

        {!loadingTopics && (
          <StudioSiriControl
            className="mt-10 h-20"
            phase={recorder.phase}
            onPrimary={handlePrimary}
            onStop={handleStop}
            stream={recorder.stream}
            disabled={total === 0 && recorder.phase === "idle"}
            disabledLabel="No topic to record"
          />
        )}

        {recorder.error && (
          <p className="mt-3 text-center text-xs text-destructive">{recorder.error}</p>
        )}

        {recorder.hasBlob && recorder.phase !== "idle" && (
          <StudioTakeActions
            className="mt-8"
            onRetake={handleRetake}
            onSave={() => void handleSave()}
            isSaving={isSaving}
          />
        )}

        <RedactParticipantSheet
          open={redacting !== null}
          onOpenChange={(next) => !next && setRedacting(null)}
          sessionId={sessionId}
          participantId={redacting?.id ?? null}
          participantName={redacting?.label ?? "They"}
          onRedacted={() => {
            /* Their turns are cut and the session is whole again, so the
               take that was refused can go up as it is. */
            setRedacting(null);
            setConsentBlocked(false);
            void handleSave();
          }}
        />

        <ConsentBlockedSheet
          open={consentBlocked}
          onOpenChange={setConsentBlocked}
          sessionId={sessionId}
          onRemoveFromRecording={(participant) => {
            setConsentBlocked(false);
            setRedacting(participant);
          }}
          onResolved={() => {
            /* Consent is on file now, so the take that was refused can go up
               as it is. Nothing was recorded again and nothing was lost. */
            setConsentBlocked(false);
            void handleSave();
          }}
        />

        <ParticipantIntakeModal
          open={intakeOpen}
          onOpenChange={setIntakeOpen}
          focusGroupSession={items[currentIndex]?.prompt ?? "Focus group session"}
          focusGroupTopicId={topics[currentIndex]?.id}
          onComplete={(session) => setSessionId(session.id)}
        />
      </DesktopPageShell>

      <StudioVoiceBeam
        stream={recorder.stream}
        phase={recorder.phase}
        processing={isSaving}
      />
    </>
  );
}
