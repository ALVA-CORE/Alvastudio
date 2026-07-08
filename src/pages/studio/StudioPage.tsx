import { useMemo, useState } from "react";
import SkipNext from "@solar-icons/react/video/SkipNext";
import SkipPrevious from "@solar-icons/react/video/SkipPrevious";
import { StudioModeSwitcher, type StudioMode } from "@/components/studio/StudioModeSwitcher";
import { StudioProgress } from "@/components/studio/StudioProgress";
import { StudioPromptStack, type StackCard } from "@/components/studio/StudioPromptStack";
import { StudioRecorderPanel } from "@/components/studio/StudioRecorderPanel";
import { StudioSessionDetails } from "@/components/studio/StudioSessionDetails";
import { TextureButton } from "@/components/ui/texture-button";

const promptCards: StackCard[] = [
  {
    id: 1,
    name: "Prompt 014",
    designation: "Prompt reader",
    content: "Tell us about the first place in Nigeria that really feels like home to you.",
  },
  {
    id: 2,
    name: "Prompt 015",
    designation: "Prompt reader",
    content: "Describe a market or street near you and the kinds of sounds somebody would hear there.",
  },
  {
    id: 3,
    name: "Prompt 016",
    designation: "Prompt reader",
    content: "Say this clearly: the network dropped for five minutes before it came back again.",
  },
  {
    id: 4,
    name: "Prompt 017",
    designation: "Prompt reader",
    content: "Talk about one food you miss whenever you travel away from home.",
  },
];

const stimuliCards: StackCard[] = [
  {
    id: 11,
    name: "Stimulus A",
    designation: "Narration",
    content: "Tell a detailed story about a day when everything that could go wrong actually went wrong.",
  },
  {
    id: 12,
    name: "Stimulus B",
    designation: "Narration",
    content: "Explain a difficult decision you made recently and how you arrived at it.",
  },
  {
    id: 13,
    name: "Stimulus C",
    designation: "Narration",
    content: "Walk us through how you would prepare for an important journey from start to finish.",
  },
];

const focusCards: StackCard[] = [
  {
    id: 21,
    name: "Group brief 01",
    designation: "Focus group",
    content: "Get everybody to introduce themselves, then discuss one habit young people have that older people always complain about.",
  },
  {
    id: 22,
    name: "Group brief 02",
    designation: "Focus group",
    content: "Ask the group to debate whether remote work is better than going to the office every day.",
  },
];

export default function StudioPage() {
  const [mode, setMode] = useState<StudioMode>("prompt");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recording, setRecording] = useState(false);

  const items = useMemo(() => {
    if (mode === "stimuli") return stimuliCards;
    if (mode === "focus") return focusCards;
    return promptCards;
  }, [mode]);

  const activeLabel =
    mode === "prompt"
      ? "Prompt reader"
      : mode === "stimuli"
        ? "Stimuli narration"
        : "Focus group capture";

  const details =
    mode === "focus"
      ? [
          { label: "Mic monitor", value: "Signal good · low-noise room" },
          { label: "Participants", value: "4 people logged · metadata ready" },
          { label: "Review output", value: "Session will land in intern QA queue" },
        ]
      : [
          { label: "Permission", value: "Mic access granted on this device" },
          { label: "Playback", value: "Preview, speed control, discard take" },
          { label: "Review output", value: "Submit sends this clip to review" },
        ];

  const total = items.length;
  const currentStep = currentIndex + 1;

  const handleModeChange = (nextMode: StudioMode) => {
    setMode(nextMode);
    setCurrentIndex(0);
    setRecording(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % total);
    setRecording(false);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
    setRecording(false);
  };

  const handleReset = () => {
    setRecording(false);
  };

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-semibold">Record</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Prompt reader, narration, and focus capture in one shell.
      </p>

      <StudioModeSwitcher
        value={mode}
        onChange={handleModeChange}
        allowFocusGroup
      />

      <StudioProgress
        current={currentStep}
        total={total}
        label={mode === "focus" ? "Session progress" : "Queue progress"}
        className="mt-5"
      />

      <div className="mt-6">
        <StudioPromptStack items={items} current={currentIndex} />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <TextureButton
          variant="primary"
          size="icon"
          className="h-11 w-11 rounded-full"
          onClick={handlePrevious}
          aria-label="Previous card"
        >
          <SkipPrevious size={18} weight="Outline" />
        </TextureButton>
        <TextureButton
          variant="primary"
          size="sm"
          className="flex-1"
          onClick={handleNext}
        >
          <span className="flex items-center justify-center gap-2">
            Skip this one
            <SkipNext size={16} weight="Outline" />
          </span>
        </TextureButton>
      </div>

      <StudioRecorderPanel
        className="mt-6"
        recording={recording}
        modeLabel={activeLabel}
        duration={recording ? "01:42" : "00:00"}
        onToggleRecording={() => setRecording((value) => !value)}
        onNext={handleNext}
        onReset={handleReset}
      />

      <StudioSessionDetails
        className="mt-6"
        title={mode === "focus" ? "Session extras" : "Capture extras"}
        subtitle={
          mode === "focus"
            ? "Participant logging, mic confidence, and review routing."
            : "All the useful bits around recording that make the flow feel premium."
        }
        details={details}
      />
    </div>
  );
}
