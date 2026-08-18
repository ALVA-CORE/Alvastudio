import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import Restart from "@solar-icons/react/arrows/Restart";
import TrashBinMinimalistic from "@solar-icons/react/ui/TrashBinMinimalistic";
import Diskette from "@solar-icons/react/devices/Diskette";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import Stop from "@solar-icons/react/video/Stop";
import Play from "@solar-icons/react/video/Play";
import { PROMPT_READER_PROMPTS, STIMULI_PROMPTS } from "@/data/prompts";
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const recorder = useStudioRecorder();

  const items = useMemo(() => {
    if (mode === "stimuli") return toCards(STIMULI_PROMPTS);
    return toCards(PROMPT_READER_PROMPTS);
  }, [mode]);

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
    setCurrentIndex(0);
    recorder.discardRecording();
    alvaToast.show(`Switched to ${MODE_LABEL[nextMode]}`, { variant: "default" });
  };

  const goTo = (updater: (prev: number) => number) => {
    setCurrentIndex((prev) => (updater(prev) + total) % total);
    recorder.discardRecording();
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

  const handleSave = () => {
    alvaToast.success("Clip saved to review queue", <Diskette size={14} weight="Bold" />);
    goTo((prev) => prev + 1);
  };

  return (
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
          current={currentIndex + 1}
          total={total}
          label="Queue progress"
        />
      </div>

      <StudioPromptStack
        className="mt-8"
        items={items}
        current={currentIndex}
        onNext={() => goTo((prev) => prev + 1)}
        onPrevious={() => goTo((prev) => prev - 1)}
      />

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

          <TextureButton variant="alva" size="sm" className="w-auto" onClick={handleSave}>
            <span className="flex items-center gap-2">
              <Diskette size={16} weight="Bold" />
              Save
            </span>
          </TextureButton>
        </div>
      )}
    </div>
  );
}
