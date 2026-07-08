import { motion } from "framer-motion";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import Play from "@solar-icons/react/video/Play";
import Stop from "@solar-icons/react/video/Stop";
import { BorderBeam } from "border-beam";
import { cn } from "@/lib/utils";
import type { RecorderPhase } from "@/hooks/useStudioRecorder";

type StudioSiriControlProps = {
  phase: RecorderPhase;
  levels: number[];
  onPrimary: () => void;
  className?: string;
};

export function StudioSiriControl({
  phase,
  levels,
  onPrimary,
  className,
}: StudioSiriControlProps) {
  const waveActive = phase === "recording" || phase === "playing";
  const waveFrozen = phase === "recorded";

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <AudioWave active={waveActive} frozen={waveFrozen} levels={levels} />

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

function SiriBlob({ phase }: { phase: RecorderPhase }) {
  const isRecording = phase === "recording";

  return (
    <div className="relative flex size-24 items-center justify-center rounded-full bg-alva-bg">
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, hsl(var(--alva-gradient-a)), hsl(var(--alva-gradient-b)), hsl(var(--alva-gradient-c)), hsl(var(--alva-gradient-a)))",
        }}
        animate={{ rotate: 360 }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: isRecording ? 3.5 : 8,
        }}
      />

      <motion.div
        className="absolute size-16 rounded-full blur-md"
        style={{ background: "hsl(var(--alva-gradient-a) / 0.9)" }}
        animate={{
          x: [-10, 12, -6, -10],
          y: [-8, 6, 12, -8],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{
          repeat: Infinity,
          ease: "easeInOut",
          duration: isRecording ? 2.4 : 5,
        }}
      />
      <motion.div
        className="absolute size-14 rounded-full blur-md"
        style={{ background: "hsl(var(--alva-gradient-c) / 0.85)" }}
        animate={{
          x: [10, -12, 6, 10],
          y: [8, -6, -12, 8],
          scale: [1, 0.9, 1.2, 1],
        }}
        transition={{
          repeat: Infinity,
          ease: "easeInOut",
          duration: isRecording ? 2.8 : 6,
        }}
      />

      <div className="absolute inset-[3px] rounded-full bg-alva-bg/78 backdrop-blur-sm" />

      <div className="relative z-[1] text-alva-bg">
        {phase === "idle" && (
          <Microphone3 size={30} weight="BoldDuotone" />
        )}
        {phase === "recording" && <Stop size={28} weight="Bold" />}
        {(phase === "recorded" || phase === "playing") && (
          <Play size={28} weight="Bold" />
        )}
      </div>
    </div>
  );
}

function AudioWave({
  active,
  levels,
  frozen,
}: {
  active: boolean;
  levels: number[];
  frozen?: boolean;
}) {
  if (!active && !frozen) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 z-[1] flex h-16 w-[min(100vw-1.5rem,26rem)] -translate-x-1/2 items-center justify-between px-1">
      {levels.map((level, index) => {
        const height = 4 + level * 22;

        return (
          <span
            key={index}
            className="rounded-full bg-[linear-gradient(180deg,hsl(var(--alva-gradient-a)),hsl(var(--alva-gradient-b)),hsl(var(--alva-gradient-c)))]"
            style={{
              width: "4px",
              height,
              opacity: frozen ? 0.55 : 0.65 + level * 0.35,
              transition: frozen ? "none" : "height 90ms linear, opacity 120ms linear",
            }}
          />
        );
      })}
    </div>
  );
}
