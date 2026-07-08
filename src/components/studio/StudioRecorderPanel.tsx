import Play from "@solar-icons/react/video/Play";
import PlaybackSpeed from "@solar-icons/react/video/PlaybackSpeed";
import RefreshCircle from "@solar-icons/react/arrows/RefreshCircle";
import SkipNext from "@solar-icons/react/video/SkipNext";
import Soundwave from "@solar-icons/react/video/Soundwave";
import StopCircle from "@solar-icons/react/video/StopCircle";
import { BorderBeamCard } from "@/components/shared";
import { BgAnimateButton } from "@/components/ui/bg-animate-button";
import { TextureButton } from "@/components/ui/texture-button";
import { cn } from "@/lib/utils";

type StudioRecorderPanelProps = {
  recording: boolean;
  modeLabel: string;
  duration: string;
  onToggleRecording: () => void;
  onNext: () => void;
  onReset: () => void;
  className?: string;
};

const checklist = [
  "Mic ready",
  "Draft auto-saved",
  "Noise check active",
  "Clip will go to review",
];

export function StudioRecorderPanel({
  recording,
  modeLabel,
  duration,
  onToggleRecording,
  onNext,
  onReset,
  className,
}: StudioRecorderPanelProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <BorderBeamCard
        beam={recording ? "md" : "pulse-inner"}
        className="rounded-[28px]"
      >
        <section className="rounded-[28px] bg-alva-card px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{modeLabel}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                {duration}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-alva-surface px-3 py-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  "size-2 rounded-full",
                  recording ? "bg-alva-accent animate-pulse" : "bg-muted-foreground/45"
                )}
              />
              {recording ? "Recording live" : "Ready to capture"}
            </div>
          </div>

          <div className="mt-6 flex min-h-[10rem] items-center justify-center">
            <AudioAura recording={recording} />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <BgAnimateButton
              gradient="alva"
              animation="spin-fast"
              rounded="full"
              size="lg"
              shadow="deeper"
              className="flex-1"
              onClick={onToggleRecording}
            >
              <span className="flex items-center justify-center gap-2">
                <Soundwave size={18} weight="BoldDuotone" />
                {recording ? "Stop recording" : "Start recording"}
              </span>
            </BgAnimateButton>

            <TextureButton
              variant="primary"
              size="icon"
              className="h-12 w-12 shrink-0 rounded-full"
              onClick={recording ? onNext : onReset}
              aria-label={recording ? "Skip current item" : "Reset current take"}
            >
              {recording ? (
                <SkipNext size={18} weight="Outline" />
              ) : (
                <RefreshCircle size={18} weight="Outline" />
              )}
            </TextureButton>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <ControlChip
              icon={<Play size={16} weight="Outline" />}
              label="Playback"
              value="1 take"
            />
            <ControlChip
              icon={<PlaybackSpeed size={16} weight="Outline" />}
              label="Speed"
              value="1.0x"
            />
            <ControlChip
              icon={<StopCircle size={16} weight="Outline" />}
              label="Discard"
              value="Ask first"
            />
          </div>
        </section>
      </BorderBeamCard>

      <div className="grid grid-cols-2 gap-2">
        {checklist.map((item) => (
          <div
            key={item}
            className="rounded-2xl bg-alva-surface px-3 py-3 text-xs text-muted-foreground"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function AudioAura({ recording }: { recording: boolean }) {
  return (
    <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_50%_50%,rgba(198,255,0,0.16),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]">
      <div
        className={cn(
          "absolute inset-x-10 h-24 rounded-full blur-3xl transition-all duration-700",
          recording
            ? "bg-[linear-gradient(90deg,rgba(31,234,157,0.45),rgba(198,255,0,0.52),rgba(115,255,92,0.45))] scale-100 opacity-100"
            : "bg-[linear-gradient(90deg,rgba(31,234,157,0.18),rgba(198,255,0,0.22),rgba(115,255,92,0.18))] scale-90 opacity-60"
        )}
      />
      <div className="relative flex items-end gap-1.5">
        {Array.from({ length: 18 }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "w-2 rounded-full bg-[linear-gradient(180deg,hsl(var(--alva-gradient-a)),hsl(var(--alva-gradient-b)),hsl(var(--alva-gradient-c)))] transition-all duration-500",
              recording ? "animate-pulse" : ""
            )}
            style={{
              height: `${recording ? 24 + ((index * 17) % 56) : 18 + ((index * 9) % 28)}px`,
              animationDelay: `${index * 70}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ControlChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-alva-surface px-3 py-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
