import { useMemo, useState } from "react";
import Restart from "@solar-icons/react/arrows/Restart";
import TrashBinMinimalistic from "@solar-icons/react/ui/TrashBinMinimalistic";
import Diskette from "@solar-icons/react/devices/Diskette";
import {
  FOCUS_GROUP_PROMPTS,
  PROMPT_READER_PROMPTS,
  STIMULI_PROMPTS,
} from "@/data/prompts";
import { useStudioRecorder } from "@/hooks/useStudioRecorder";
import { StudioModeDropdown, type StudioMode } from "@/components/studio/StudioModeDropdown";
import { StudioProgress } from "@/components/studio/StudioProgress";
import { StudioPromptStack, type PromptCard } from "@/components/studio/StudioPromptStack";
import { StudioSiriControl } from "@/components/studio/StudioSiriControl";
import { TextureButton } from "@/components/ui/texture-button";

function toCards(items: { id: number; text: string }[]): PromptCard[] {
  return items.map((item) => ({ id: item.id, prompt: item.text }));
}

export default function StudioPage() {
  const [mode, setMode] = useState<StudioMode>("prompt");
  const [currentIndex, setCurrentIndex] = useState(0);
  const recorder = useStudioRecorder();

  const items = useMemo(() => {
    if (mode === "stimuli") return toCards(STIMULI_PROMPTS);
    if (mode === "focus") return toCards(FOCUS_GROUP_PROMPTS);
    return toCards(PROMPT_READER_PROMPTS);
  }, [mode]);

  const total = items.length;

  const handleModeChange = (nextMode: StudioMode) => {
    setMode(nextMode);
    setCurrentIndex(0);
    recorder.discardRecording();
  };

  const goTo = (updater: (prev: number) => number) => {
    setCurrentIndex((prev) => (updater(prev) + total) % total);
    recorder.discardRecording();
  };

  const handlePrimary = async () => {
    if (recorder.phase === "idle") {
      await recorder.startRecording();
      return;
    }
    if (recorder.phase === "recording") {
      recorder.stopRecording();
      return;
    }
    if (recorder.phase === "recorded" || recorder.phase === "playing") {
      await recorder.playRecording();
    }
  };

  const progressLabel =
    mode === "focus" ? "Session progress" : "Queue progress";

  return (
    <div className="px-4 py-6">
      <div className="flex items-start gap-3">
        <StudioModeDropdown
          value={mode}
          onChange={handleModeChange}
          allowFocusGroup
        />
        <StudioProgress
          className="min-w-0 flex-1"
          current={currentIndex + 1}
          total={total}
          label={progressLabel}
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
        levels={recorder.levels}
        onPrimary={handlePrimary}
      />

      {recorder.error && (
        <p className="mt-3 text-center text-xs text-destructive">{recorder.error}</p>
      )}

      {recorder.hasBlob && recorder.phase !== "idle" && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <TextureButton
            variant="minimal"
            size="sm"
            className="w-auto"
            onClick={recorder.discardRecording}
          >
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
            onClick={recorder.discardRecording}
          >
            <TrashBinMinimalistic size={16} weight="Outline" />
          </TextureButton>

          <TextureButton
            variant="alva"
            size="sm"
            className="w-auto"
            onClick={() => goTo((prev) => prev + 1)}
          >
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
