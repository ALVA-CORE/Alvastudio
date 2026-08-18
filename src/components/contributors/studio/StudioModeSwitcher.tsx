import Microphone3 from "@solar-icons/react/video/Microphone3";
import PlaylistMinimalistic from "@solar-icons/react/list/PlaylistMinimalistic";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import { cn } from "@/lib/utils";

export type StudioMode = "prompt" | "stimuli" | "focus";

const MODES: Array<{
  id: StudioMode;
  label: string;
  icon: typeof Microphone3;
}> = [
  { id: "prompt", label: "Prompt reader", icon: PlaylistMinimalistic },
  { id: "stimuli", label: "Stimuli", icon: Microphone3 },
  { id: "focus", label: "Focus group", icon: UsersGroupRounded },
];

type StudioModeSwitcherProps = {
  value: StudioMode;
  onChange: (mode: StudioMode) => void;
  allowFocusGroup?: boolean;
};

export function StudioModeSwitcher({
  value,
  onChange,
  allowFocusGroup = false,
}: StudioModeSwitcherProps) {
  const visibleModes = MODES.filter((mode) => allowFocusGroup || mode.id !== "focus");

  return (
    <div
      className={cn(
        "grid gap-2 rounded-2xl bg-alva-surface p-1.5",
        visibleModes.length === 3 ? "grid-cols-3" : "grid-cols-2"
      )}
    >
      {visibleModes.map((mode) => {
        const Icon = mode.icon;
        const isActive = mode.id === value;

        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            className={cn(
              "rounded-[1rem] px-3 py-3 text-left transition-all",
              isActive
                ? "bg-alva-card text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <Icon
                size={18}
                weight={isActive ? "BoldDuotone" : "Outline"}
                className={isActive ? "text-alva-accent" : undefined}
              />
              <span className="text-sm font-medium">{mode.label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
