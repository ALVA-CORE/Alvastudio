import { useMemo, useState } from "react";
import Restart from "@solar-icons/react/arrows/Restart";
import TrashBinMinimalistic from "@solar-icons/react/ui/TrashBinMinimalistic";
import Diskette from "@solar-icons/react/devices/Diskette";
import { StudioModeSwitcher, type StudioMode } from "@/components/studio/StudioModeSwitcher";
import { StudioProgress } from "@/components/studio/StudioProgress";
import { StudioPromptStack, type PromptCard } from "@/components/studio/StudioPromptStack";
import {
  StudioSiriControl,
  type RecordStatus,
} from "@/components/studio/StudioSiriControl";
import { TextureButton } from "@/components/ui/texture-button";

const promptCards: PromptCard[] = [
  { id: 1, prompt: "Tell us about the first place in Nigeria that really feels like home to you." },
  { id: 2, prompt: "Describe a market near you and the kinds of sounds somebody would hear there." },
  { id: 3, prompt: "The network dropped for five minutes before it came back again." },
  { id: 4, prompt: "Talk about one food you miss whenever you travel away from home." },
];

const stimuliCards: PromptCard[] = [
  { id: 11, prompt: "Tell a story about a day when everything that could go wrong actually went wrong." },
  { id: 12, prompt: "Explain a difficult decision you made recently and how you arrived at it." },
  { id: 13, prompt: "Walk us through how you would prepare for an important journey." },
];

const focusCards: PromptCard[] = [
  { id: 21, prompt: "Discuss one habit young people have that older people always complain about." },
  { id: 22, prompt: "Debate whether remote work is better than going to the office every day." },
];

export default function StudioPage() {
  const [mode, setMode] = useState<StudioMode>("prompt");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<RecordStatus>("idle");

  const items = useMemo(() => {
    if (mode === "stimuli") return stimuliCards;
    if (mode === "focus") return focusCards;
    return promptCards;
  }, [mode]);

  const total = items.length;

  const handleModeChange = (nextMode: StudioMode) => {
    setMode(nextMode);
    setCurrentIndex(0);
    setStatus("idle");
  };

  const goTo = (updater: (prev: number) => number) => {
    setCurrentIndex((prev) => (updater(prev) + total) % total);
    setStatus("idle");
  };

  const handlePrimary = () => {
    setStatus((prev) =>
      prev === "idle" ? "recording" : prev === "recording" ? "recorded" : "recording"
    );
  };

  return (
    <div className="px-4 py-6">
      <StudioModeSwitcher value={mode} onChange={handleModeChange} allowFocusGroup />

      <StudioProgress
        current={currentIndex + 1}
        total={total}
        label={mode === "focus" ? "Session progress" : "Queue progress"}
        className="mt-5"
      />

      <StudioPromptStack
        className="mt-8"
        items={items}
        current={currentIndex}
        onNext={() => goTo((prev) => prev + 1)}
        onPrevious={() => goTo((prev) => prev - 1)}
      />

      <StudioSiriControl
        className="mt-10 h-24"
        status={status}
        onPrimary={handlePrimary}
      />

      {status === "recorded" && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <TextureButton
            variant="minimal"
            size="sm"
            className="w-auto"
            onClick={() => setStatus("idle")}
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
            onClick={() => setStatus("idle")}
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
