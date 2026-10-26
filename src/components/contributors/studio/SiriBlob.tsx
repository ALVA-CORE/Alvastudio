import { AnimatePresence, motion } from "framer-motion";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import type { ComponentType } from "react";
import Play from "@solar-icons/react/video/Play";
import Pause from "@solar-icons/react/video/Pause";
import Stop from "@solar-icons/react/video/Stop";
import { cn } from "@/lib/utils";
import type { RecorderPhase } from "@/hooks/useStudioRecorder";

type SiriBlobProps = {
  phase?: RecorderPhase;
  size?: "nav" | "md" | "lg";
  /**
   * Replaces the microphone at rest.
   *
   * The blob is a treatment, not a meaning: on the annotator rail it marks the
   * session queue, where a microphone would promise recording. Recording and
   * playback still show Stop and Play, because those are states this blob
   * genuinely has.
   */
  idleIcon?: ComponentType<{ size?: number; weight?: "BoldDuotone" | "Bold" }>;
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
  /**
   * The record button, reduced.
   *
   * It was `size-24` and alone in the middle of the screen. The row now
   * carries a live waveform and a stop button beside it, so the button is
   * one control among three rather than the whole composition.
   */
  md: {
    outer: "size-16",
    blurA: "size-11",
    blurB: "size-10",
    icon: 22,
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

/** Which of the four the phase shows. Two phases share `play` on purpose. */
const GLYPH: Record<RecorderPhase, "idle" | "stop" | "play" | "pause"> = {
  idle: "idle",
  recording: "stop",
  paused: "play",
  recorded: "play",
  playing: "pause",
};

export function SiriBlob({
  phase = "idle",
  size = "lg",
  idleIcon: IdleIcon = Microphone3,
  className,
}: SiriBlobProps) {
  const isRecording = phase === "recording";
  const s = SIZE[size];
  const glyph = GLYPH[phase];

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

      {/* Four glyphs across five phases, and no more: a mic to begin, stop
          to end a take, play to start or resume, pause to hold playback. A
          paused take shows play, because what the press does is carry on.

          They cross-fade rather than cut. The button does not move between
          phases, so a hard swap is the only thing that changes and it reads
          as a flicker; keyed on the glyph rather than the phase, so paused
          and recorded both showing play is one icon that stays put. */}
      <div className="relative z-[1] grid place-items-center text-alva-bg">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={glyph}
            className="col-start-1 row-start-1 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          >
            {glyph === "idle" ? (
              <IdleIcon size={s.icon} weight="BoldDuotone" />
            ) : glyph === "stop" ? (
              <Stop size={s.icon - 2} weight="Bold" />
            ) : glyph === "play" ? (
              <Play size={s.icon - 2} weight="Bold" />
            ) : (
              <Pause size={s.icon - 2} weight="Bold" />
            )}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
