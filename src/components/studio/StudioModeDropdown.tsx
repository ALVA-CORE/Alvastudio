import Microphone3 from "@solar-icons/react/video/Microphone3";
import AltArrowDown from "@solar-icons/react/arrows/AltArrowDown";
import PlaylistMinimalistic from "@solar-icons/react/list/PlaylistMinimalistic";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type StudioModeDropdownProps = {
  value: StudioMode;
  onChange: (mode: StudioMode) => void;
  allowFocusGroup?: boolean;
};

export function StudioModeDropdown({
  value,
  onChange,
  allowFocusGroup = false,
}: StudioModeDropdownProps) {
  const visibleModes = MODES.filter((mode) => allowFocusGroup || mode.id !== "focus");
  const active = MODES.find((mode) => mode.id === value) ?? MODES[0];
  const ActiveIcon = active.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Switch recording mode"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-alva-surface px-3 text-foreground"
        >
          <AltArrowDown size={16} weight="Outline" className="text-muted-foreground" />
          <ActiveIcon size={18} weight="BoldDuotone" className="text-alva-accent" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[11rem] border-alva-border bg-alva-card"
      >
        {visibleModes.map((mode) => {
          const Icon = mode.icon;
          const isActive = mode.id === value;

          return (
            <DropdownMenuItem
              key={mode.id}
              onClick={() => onChange(mode.id)}
              className={cn(
                "flex items-center gap-2",
                isActive && "bg-alva-surface text-foreground"
              )}
            >
              <Icon
                size={18}
                weight={isActive ? "BoldDuotone" : "Outline"}
                className={isActive ? "text-alva-accent" : "text-muted-foreground"}
              />
              {mode.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
