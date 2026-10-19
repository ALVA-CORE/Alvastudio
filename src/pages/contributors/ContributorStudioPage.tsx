import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Restart from "@solar-icons/react/arrows/Restart";
import TrashBinMinimalistic from "@solar-icons/react/ui/TrashBinMinimalistic";
import Diskette from "@solar-icons/react/devices/Diskette";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import Stop from "@solar-icons/react/video/Stop";
import Play from "@solar-icons/react/video/Play";
import ClipboardCheck from "@solar-icons/react/notes/ClipboardCheck";
import { useApiResource } from "@/hooks/useApiResource";
import { listPrompts, listStimuli } from "@/lib/api/catalog";
import { recordingQuota } from "@/lib/api/recordings";
import { submitPromptRead, submitStimulus } from "@/lib/api/recordings";
import { ApiError } from "@/lib/api/client";
import { useStudioRecorder } from "@/hooks/useStudioRecorder";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth/context";
import { isStaffRole } from "@/lib/auth/roles";
import { alvaToast } from "@/lib/alva-toast";
import { ContributorDesktopGate } from "@/components/layout/ContributorDesktopGate";
import { StudioModeDropdown, type StudioMode } from "@/components/contributors/studio/StudioModeDropdown";
import { StudioProgress } from "@/components/contributors/studio/StudioProgress";
import { StudioPromptStack } from "@/components/contributors/studio/StudioPromptStack";
import { StudioSiriControl } from "@/components/contributors/studio/StudioSiriControl";
import { AlvaEmptyState } from "@/components/shared/states/AlvaEmptyState";
import { StudioVoiceBeam } from "@/components/contributors/studio/StudioVoiceBeam";
import { TextureButton } from "@/components/ui/texture-button";

/**
 * When uploads reopen, in the contributor's own time.
 *
 * `available_again_at` is a WAT instant, so a plain local time is right: the
 * limit resets at midnight in Nigeria and everybody using this is there.
 */
function quotaMessage(quota: { available_again_at: string | null } | null) {
  if (!quota?.available_again_at) return "Daily upload limit reached";
  const when = new Date(quota.available_again_at);
  return `Upload limit reached, back at ${when.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

const MODE_LABEL: Record<Exclude<StudioMode, "focus">, string> = {
  prompt: "Prompt reader",
  stimuli: "Stimuli",
};

export default function ContributorStudioPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isStaff = isStaffRole(user?.role);
  const [mode, setMode] = useState<Exclude<StudioMode, "focus">>("prompt");
  const recorder = useStudioRecorder();

  const [isSaving, setSaving] = useState(false);

  /* The whole active bank, not one card.
   *
   * `/prompts/next` hands out the contributor's next UNREAD item and stops
   * once they have worked through the bank. That is the wrong model here: a
   * prompt is not consumed by being read, and twelve prompts in the bank
   * should be twelve prompts every contributor can record, not twelve
   * recordings shared between everybody. So the studio reads the bank and
   * pages through it locally. */
  const fetchBank = useCallback(
    () =>
      mode === "stimuli"
        ? listStimuli({ is_active: true, limit: 200 })
        : listPrompts({ is_active: true, limit: 200 }),
    [mode]
  );

  const {
    data: bank,
    isLoading: loadingCard,
    error: cardError,
  } = useApiResource(fetchBank, [mode]);

  /* Checked before anybody speaks. A refusal at upload would throw away a
   * take somebody has just recorded, which is the one failure worth a round
   * trip to avoid. */
  const { data: quota, reload: reloadQuota } = useApiResource(recordingQuota, []);
  const outOfQuota = quota != null && quota.remaining <= 0;

  const items = (bank ?? []).map((entry) => ({ id: entry.id, prompt: entry.text }));
  const total = items.length;

  /* Which card is on top. Paging is local now, so swiping does not refetch. */
  const [index, setIndex] = useState(0);
  const card = total > 0 ? items[((index % total) + total) % total] : null;

  /* A fresh bank, or a switch between prompts and stimuli, starts at the top
   * rather than wherever the previous one had been left. */
  useEffect(() => setIndex(0), [mode, total]);

  useEffect(() => {
    if (recorder.error) {
      alvaToast.error(recorder.error);
    }
  }, [recorder.error]);

  if (isStaff) {
    return <Navigate to="/intern/record" replace />;
  }

  if (!isMobile) {
    return <ContributorDesktopGate />;
  }

  const handleModeChange = (nextMode: StudioMode) => {
    if (nextMode === "focus") return;
    setMode(nextMode);
    recorder.discardRecording();
    alvaToast.show(`Switched to ${MODE_LABEL[nextMode]}`, { variant: "default" });
  };


  const handlePrimary = async () => {
    /* No card means no `prompt_id` to submit against, so a take recorded here
       could never be uploaded — it used to be allowed, then failed at Save
       with "Record a take first", which blamed the wrong thing. */
    if (!card && recorder.phase === "idle") {
      alvaToast.show("Nothing to record right now", { variant: "default" });
      return;
    }

    if (outOfQuota && recorder.phase === "idle") {
      alvaToast.show(quotaMessage(quota), { variant: "default" });
      return;
    }

    if (recorder.phase === "idle") {
      await recorder.startRecording();
      alvaToast.accent("Recording started", <Microphone3 size={14} weight="Bold" />);
      return;
    }
    if (recorder.phase === "recording") {
      recorder.stopRecording();
      alvaToast.success("Take saved, tap play to review", <Stop size={14} weight="Bold" />);
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

  const handleRetake = () => {
    recorder.discardRecording();
    alvaToast.show("Take cleared, ready to record again");
  };

  const handleSave = async () => {
    const blob = recorder.getBlob();
    if (!blob) {
      alvaToast.error("Record a take first");
      return;
    }
    if (!card) {
      alvaToast.error("This take has no prompt to attach to");
      return;
    }

    setSaving(true);
    try {
      const meta = {
        durationSeconds: recorder.getDuration(),
        /* The real extension, from what the recorder produced. An mp4
         * sent as .webm is a 415 or a mis-decode at the other end. */
        filename: recorder.getFilename(),
        /* What the clip was actually recorded on. The profile holds a device
         * the contributor typed once; this is the mic in front of them for
         * this take, which is what a reviewer judging audio quality needs. */
        deviceMic: recorder.getDeviceMic() || undefined,
      };

      if (mode === "stimuli") {
        await submitStimulus(card.id, blob, meta);
      } else {
        await submitPromptRead(card.id, blob, meta);
      }

      alvaToast.success("Clip sent for review", <Diskette size={14} weight="Bold" />);
      reloadQuota();
      recorder.discardRecording();
      /* Move on, but keep the prompt in the bank. A prompt is not used up by
         being read, and the same one is recordable by everybody else. */
      setIndex((value) => value + 1);
    } catch (cause) {
      alvaToast.error(
        cause instanceof ApiError ? cause.message : "Could not upload the clip."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="px-4 py-6">
        <div className="flex items-start gap-2">
          <StudioModeDropdown
            value={mode}
            onChange={handleModeChange}
            allowFocusGroup={false}
            focusGroupOnly={false}
          />
          <StudioProgress
            className="min-w-0 flex-1"
            current={total ? index + 1 : 0}
            total={total}
            label={loadingCard ? "Loading…" : total ? "Next up" : "Queue empty"}
          />
        </div>

        {cardError ? (
          <p role="alert" className="mt-8 text-center text-sm text-destructive">
            {cardError}
          </p>
        ) : !loadingCard && total === 0 ? (
          /* 404 from /next means the bank is exhausted for this contributor —
             an end state, not a failure. */
          <AlvaEmptyState
            className="mt-6"
            icon={<ClipboardCheck size={20} weight="Outline" />}
            title="Nothing left to record"
            description="You have worked through every prompt in the bank. Check back later for more."
          />
        ) : (
          <StudioPromptStack
            className="mt-8"
            items={items}
            current={index}
            onNext={() => setIndex((value) => value + 1)}
            onPrevious={() => setIndex((value) => value - 1)}
          />
        )}

        <StudioSiriControl
          className="mt-10 h-28"
          phase={recorder.phase}
          onPrimary={handlePrimary}
          disabled={(!card || outOfQuota) && recorder.phase === "idle"}
          disabledLabel={
            outOfQuota ? quotaMessage(quota) : "Nothing to record right now"
          }
        />

        {recorder.error && (
          <p className="mt-3 text-center text-xs text-destructive">{recorder.error}</p>
        )}

        {recorder.hasBlob && recorder.phase !== "idle" && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <TextureButton variant="minimal" size="sm" className="w-auto" onClick={handleRetake}>
              <span className="flex items-center gap-2">
                <Restart size={16} weight="Outline" />
                Retake
              </span>
            </TextureButton>

            <TextureButton
              variant="minimal"
              size="icon"
              className="h-10 w-10 rounded-full"
              aria-label="Delete take"
              onClick={handleRetake}
            >
              <TrashBinMinimalistic size={16} weight="Outline" />
            </TextureButton>

            <TextureButton variant="alva" size="sm" className="w-auto" onClick={handleSave}
                loading={isSaving}>
              <span className="flex items-center gap-2">
                <Diskette size={16} weight="Bold" />
                Save
              </span>
            </TextureButton>
          </div>
        )}
      </div>

      <StudioVoiceBeam
        stream={recorder.stream}
        phase={recorder.phase}
        processing={isSaving}
      />
    </>
  );
}
