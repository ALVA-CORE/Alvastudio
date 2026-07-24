import { useEffect, useMemo, useState } from "react";
import Restart from "@solar-icons/react/arrows/Restart";
import TrashBinMinimalistic from "@solar-icons/react/ui/TrashBinMinimalistic";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import Diskette from "@solar-icons/react/devices/Diskette";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import Stop from "@solar-icons/react/video/Stop";
import Play from "@solar-icons/react/video/Play";
import { FOCUS_GROUP_PROMPTS } from "@/data/prompts";
import { useStudioRecorder } from "@/hooks/useStudioRecorder";
import { alvaToast } from "@/lib/alva-toast";
import { hasLoggedParticipants, loadParticipants } from "@/lib/intern-participants";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { ParticipantIntakeModal } from "@/components/interns/participants/ParticipantIntakeModal";
import { StudioProgress } from "@/components/contributors/studio/StudioProgress";
import { StudioPromptStack, type PromptCard } from "@/components/contributors/studio/StudioPromptStack";
import { StudioSiriControl } from "@/components/contributors/studio/StudioSiriControl";
import { TextureButton } from "@/components/ui/texture-button";

function toCards(items: { id: number; text: string }[]): PromptCard[] {
  return items.map((item) => ({ id: item.id, prompt: item.text }));
}

export default function InternRecordPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [participantCount, setParticipantCount] = useState(loadParticipants().length);
  const [intakeOpen, setIntakeOpen] = useState(!hasLoggedParticipants());
  const recorder = useStudioRecorder();

  const items = useMemo(() => toCards(FOCUS_GROUP_PROMPTS), []);
  const total = items.length;
  const canRecord = participantCount > 0;

  const goTo = (updater: (prev: number) => number) => {
    setCurrentIndex((prev) => (updater(prev) + total) % total);
    recorder.discardRecording();
  };

  const handlePrimary = async () => {
    if (!canRecord) {
      setIntakeOpen(true);
      alvaToast.error("Log at least one participant before recording.");
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

  const handleSave = () => {
    alvaToast.success("Focus group clip saved", <Diskette size={14} weight="Bold" />);
    goTo((prev) => prev + 1);
  };

  useEffect(() => {
    if (recorder.error) {
      alvaToast.error(recorder.error);
    }
  }, [recorder.error]);

  return (
    <DesktopPageShell className="py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Record focus group</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Log all session participants before you start recording.
          </p>
        </div>
        <TextureButton
          variant="minimal"
          size="sm"
          className="w-auto"
          onClick={() => setIntakeOpen(true)}
        >
          <span className="flex items-center gap-2">
            <UsersGroupRounded size={16} weight="Outline" />
            Log participant ({participantCount})
          </span>
        </TextureButton>
      </div>

      {!canRecord && (
        <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Add participant details for everyone in the session before recording.
        </div>
      )}

      <StudioProgress
        current={currentIndex + 1}
        total={total}
        label="Session progress"
      />

      <StudioPromptStack
        className="mt-8"
        items={items}
        current={currentIndex}
        onNext={() => goTo((prev) => prev + 1)}
        onPrevious={() => goTo((prev) => prev - 1)}
      />

      <StudioSiriControl
        className="mt-10 h-28"
        phase={canRecord ? recorder.phase : "idle"}
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

          <TextureButton variant="alva" size="sm" className="w-auto" onClick={handleSave}>
            <span className="flex items-center gap-2">
              <Diskette size={16} weight="Bold" />
              Save
            </span>
          </TextureButton>
        </div>
      )}

      <ParticipantIntakeModal
        open={intakeOpen}
        onOpenChange={setIntakeOpen}
        onSaved={() => setParticipantCount(loadParticipants().length)}
      />
    </DesktopPageShell>
  );
}
