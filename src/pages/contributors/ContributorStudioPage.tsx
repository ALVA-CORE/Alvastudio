import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Restart from "@solar-icons/react/arrows/Restart";
import TrashBinMinimalistic from "@solar-icons/react/ui/TrashBinMinimalistic";
import Diskette from "@solar-icons/react/devices/Diskette";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import Stop from "@solar-icons/react/video/Stop";
import Play from "@solar-icons/react/video/Play";
import { useApiResource } from "@/hooks/useApiResource";
import { nextPrompt, nextStimulus } from "@/lib/api/catalog";
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
import { StudioPromptStack, type PromptCard } from "@/components/contributors/studio/StudioPromptStack";
import { StudioSiriControl } from "@/components/contributors/studio/StudioSiriControl";
import { StudioVoiceBeam } from "@/components/contributors/studio/StudioVoiceBeam";
import { TextureButton } from "@/components/ui/texture-button";

function toCards(items: { id: number; text: string }[]): PromptCard[] {
  return items.map((item) => ({ id: item.id, prompt: item.text }));
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

  /* One card at a time, straight from the bank.
   *
   * `/prompts/next` and `/stimuli/next` hand out the contributor's next UNREAD
   * item, so the studio no longer paginates a local array — advancing means
   * asking for the next one. A 404 ("No unread prompts available") is the queue
   * running dry, not an error, which is what `notFoundAsEmpty` encodes. */
  const fetchNext = useCallback(
    () => (mode === "stimuli" ? nextStimulus() : nextPrompt()),
    [mode]
  );

  const {
    data: card,
    isLoading: loadingCard,
    error: cardError,
    reload: loadNextCard,
  } = useApiResource(fetchNext, [mode], { notFoundAsEmpty: true });

  const items = card ? [{ id: card.id, prompt: card.text }] : [];
  const total = items.length;

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
    if (!card || !blob) {
      alvaToast.error("Record a take first");
      return;
    }

    setSaving(true);
    try {
      const meta = {
        durationSeconds: recorder.getDuration(),
        filename: `take-${card.id}.webm`,
      };

      if (mode === "stimuli") {
        await submitStimulus(card.id, blob, meta);
      } else {
        await submitPromptRead(card.id, blob, meta);
      }

      alvaToast.success("Clip sent for review", <Diskette size={14} weight="Bold" />);
      recorder.discardRecording();
      // The card is consumed; ask the bank for the next unread one.
      loadNextCard();
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
            current={total ? 1 : 0}
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
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Nothing left to record right now. Check back later.
          </p>
        ) : (
          <StudioPromptStack
            className="mt-8"
            items={items}
            current={0}
            onNext={loadNextCard}
            onPrevious={loadNextCard}
          />
        )}

        <StudioSiriControl
          className="mt-10 h-28"
          phase={recorder.phase}
          onPrimary={handlePrimary}
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
