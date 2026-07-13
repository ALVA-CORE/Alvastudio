import { motion } from "framer-motion";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import Play from "@solar-icons/react/video/Play";
import Stop from "@solar-icons/react/video/Stop";
import { cn } from "@/lib/utils";
import type { RecorderPhase } from "@/hooks/useStudioRecorder";

type SiriBlobProps = {
  phase?: RecorderPhase;
  size?: "nav" | "lg";
  className?: string;
};

const SIZE = {
  nav: {
    outer: "size-14",
    blurA: "size-9",
    blurB: "size-8",
    icon: 20,
    inset: "inset-[3px]",
  },
  lg: {
    outer: "size-24",
    blurA: "size-16",
    blurB: "size-14",
    icon: 30,
    inset: "inset-[3px]",
  },
} as const;

export function SiriBlob({ phase = "idle", size = "lg", className }: SiriBlobProps) {
  const isRecording = phase === "recording";
  const s = SIZE[size];

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full bg-alva-bg",
        s.outer,
        className
      )}
    >
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
        className={cn("absolute rounded-full blur-md", s.blurA)}
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
        className={cn("absolute rounded-full blur-md", s.blurB)}
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

      <div
        className={cn(
          "absolute rounded-full bg-alva-bg/78 backdrop-blur-sm",
          s.inset
        )}
      />

      <div className="relative z-[1] text-alva-bg">
        {phase === "idle" && (
          <Microphone3 size={s.icon} weight="BoldDuotone" />
        )}
        {phase === "recording" && <Stop size={s.icon - 2} weight="Bold" />}
        {(phase === "recorded" || phase === "playing") && (
          <Play size={s.icon - 2} weight="Bold" />
        )}
      </div>
    </div>
  );
}
