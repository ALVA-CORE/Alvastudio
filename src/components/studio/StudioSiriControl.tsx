import { motion } from "framer-motion";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import Play from "@solar-icons/react/video/Play";
import Stop from "@solar-icons/react/video/Stop";
import { BorderBeam } from "border-beam";
import { cn } from "@/lib/utils";
import type { RecorderPhase } from "@/hooks/useStudioRecorder";

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
        {phase === "idle" && <Microphone3 size={30} weight="BoldDuotone" />}
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
