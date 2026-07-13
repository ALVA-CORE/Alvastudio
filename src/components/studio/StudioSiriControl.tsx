import { motion } from "framer-motion";
import { BorderBeam } from "border-beam";
import { cn } from "@/lib/utils";
import type { RecorderPhase } from "@/hooks/useStudioRecorder";
import { SiriBlob } from "./SiriBlob";

type StudioSiriControlProps = {
  phase: RecorderPhase;
  onPrimary: () => void;
  className?: string;
};

const BAR_COUNT = 40;

export function StudioSiriControl({
  phase,
  onPrimary,
  className,
}: StudioSiriControlProps) {
  const waveActive = phase === "recording" || phase === "playing";
  const waveFrozen = phase === "recorded";

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <AudioWave active={waveActive} frozen={waveFrozen} />

      <button
        type="button"
        onClick={onPrimary}
        aria-label={
          phase === "idle"
            ? "Start recording"
            : phase === "recording"
              ? "Stop recording"
              : phase === "playing"
                ? "Playing recording"
                : "Replay recording"
        }
        className="relative z-[2]"
      >
        <div className="relative overflow-visible rounded-full">
          <BorderBeam
            size="pulse-outside"
            colorVariant="mono"
            theme="dark"
            strength={1}
            duration={phase === "recording" ? 1.6 : 2.4}
            borderRadius={999}
          >
            <SiriBlob phase={phase} />
          </BorderBeam>
        </div>
      </button>
    </div>
  );
}

function AudioWave({
  active,
  frozen,
}: {
  active: boolean;
  frozen?: boolean;
}) {
  if (!active && !frozen) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 z-[1] flex h-16 w-[min(100vw-2.5rem,22rem)] -translate-x-1/2 items-center justify-between px-1">
      {Array.from({ length: BAR_COUNT }).map((_, index) => {
        const center = (BAR_COUNT - 1) / 2;
        const distance = Math.abs(index - center);
        const base = Math.max(6, 18 - distance * 0.55);

        if (frozen) {
          return (
            <span
              key={index}
              className="rounded-full bg-[linear-gradient(180deg,hsl(var(--alva-gradient-a)),hsl(var(--alva-gradient-b)),hsl(var(--alva-gradient-c)))] opacity-50"
              style={{ width: "4px", height: base }}
            />
          );
        }

        return (
          <motion.span
            key={index}
            className="rounded-full bg-[linear-gradient(180deg,hsl(var(--alva-gradient-a)),hsl(var(--alva-gradient-b)),hsl(var(--alva-gradient-c)))]"
            style={{ width: "4px" }}
            animate={{
              height: [base * 0.45, base * 1.35, base * 0.65, base * 1.15, base * 0.45],
              opacity: [0.55, 0.95, 0.65, 0.9, 0.55],
            }}
            transition={{
              repeat: Infinity,
              ease: "easeInOut",
              duration: 1.1 + (index % 7) * 0.08,
              delay: index * 0.025,
            }}
          />
        );
      })}
    </div>
  );
}
