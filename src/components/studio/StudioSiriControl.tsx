import { motion } from "framer-motion";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import Play from "@solar-icons/react/video/Play";
import Stop from "@solar-icons/react/video/Stop";
import { BorderBeam } from "border-beam";
import { cn } from "@/lib/utils";

export type RecordStatus = "idle" | "recording" | "recorded";

type StudioSiriControlProps = {
  status: RecordStatus;
  onPrimary: () => void;
  className?: string;
};

const WAVE_BARS = 28;

export function StudioSiriControl({
  status,
  onPrimary,
  className,
}: StudioSiriControlProps) {
  const isRecording = status === "recording";

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <AudioWave active={isRecording} />

      <button
        type="button"
        onClick={onPrimary}
        aria-label={
          status === "idle"
            ? "Start recording"
            : status === "recording"
              ? "Stop recording"
              : "Replay recording"
        }
        className="relative z-[2]"
      >
        <div className="relative overflow-hidden rounded-full">
          <BorderBeam
            size="md"
            colorVariant="mono"
            theme="dark"
            strength={1}
            duration={isRecording ? 1.4 : 2.6}
            borderRadius={999}
          >
            <SiriBlob status={status} />
          </BorderBeam>
        </div>
      </button>
    </div>
  );
}

function SiriBlob({ status }: { status: RecordStatus }) {
  const isRecording = status === "recording";

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

      <div className="relative z-[1] text-foreground">
        {status === "idle" && (
          <Microphone3 size={30} weight="BoldDuotone" className="text-alva-accent" />
        )}
        {status === "recording" && (
          <Stop size={28} weight="Bold" className="text-alva-accent" />
        )}
        {status === "recorded" && (
          <Play size={28} weight="Bold" className="text-alva-accent" />
        )}
      </div>
    </div>
  );
}

function AudioWave({ active }: { active: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 z-[1] flex h-24 items-center justify-center gap-1 overflow-hidden opacity-90">
      {Array.from({ length: WAVE_BARS }).map((_, index) => {
        const distance = Math.abs(index - WAVE_BARS / 2);
        const base = 8 + Math.max(0, 14 - distance) * 1.6;

        return (
          <motion.span
            key={index}
            className="w-1 rounded-full bg-[linear-gradient(180deg,hsl(var(--alva-gradient-a)),hsl(var(--alva-gradient-b)),hsl(var(--alva-gradient-c)))]"
            animate={
              active
                ? { height: [base * 0.4, base * 1.7, base * 0.7, base * 1.3, base * 0.4] }
                : { height: base * 0.35 }
            }
            transition={
              active
                ? {
                    repeat: Infinity,
                    ease: "easeInOut",
                    duration: 0.9 + (index % 5) * 0.12,
                  }
                : { duration: 0.3 }
            }
            style={{ height: base * 0.35 }}
          />
        );
      })}
    </div>
  );
}
