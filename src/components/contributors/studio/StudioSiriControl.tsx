import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BorderBeam } from "border-beam";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { cn } from "@/lib/utils";
import type { RecorderPhase } from "@/hooks/useStudioRecorder";
import { SiriBlob } from "./SiriBlob";

/** How long a press has to be held before it counts as a pause. */
const HOLD_MS = 450;

type StudioSiriControlProps = {
  phase: RecorderPhase;
  /** A tap: start, stop, play or pause, depending on the phase. */
  onPrimary: () => void;
  /** A press and hold while recording. Holds the take without ending it. */
  onHold?: () => void;
  /** The live capture, so the waveform analyses the take rather than a second mic. */
  stream?: MediaStream | null;
  /** The take being played back, so the waveform moves during playback too. */
  playbackElement?: HTMLMediaElement | null;
  /** Nothing to record against — the control is inert and says why. */
  disabled?: boolean;
  disabledLabel?: string;
  className?: string;
};

/**
 * One button, centred, with the waveform behind it.
 *
 * Four glyphs and nothing else on screen: a mic to begin, stop to end a take,
 * play to start or resume, pause to hold playback. Everything the control can
 * do is the thing it is showing.
 *
 * **Tap stops, hold pauses.** Ending a take and holding it are both wanted
 * while recording, and a second button beside the first would mean the row
 * was no longer one centred control. The hold is the rarer of the two, so it
 * is the one that costs a moment.
 *
 * **The waveform reads the recorder's own stream, and the playing element.**
 * It is the take being saved, not a second capture: opening its own mic would
 * mean two `getUserMedia` grants, two live tracks and two recording
 * indicators in the browser chrome.
 */
export function StudioSiriControl({
  phase,
  onPrimary,
  onHold,
  stream = null,
  playbackElement = null,
  disabled = false,
  disabledLabel = "Nothing to record",
  className,
}: StudioSiriControlProps) {
  const recording = phase === "recording";
  const playing = phase === "playing";

  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);

  const clearHold = () => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const startHold = () => {
    if (disabled || !onHold || !recording) return;
    held.current = false;
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      onHold();
    }, HOLD_MS);
  };

  const endHold = () => {
    clearHold();
  };

  const label = disabled
    ? disabledLabel
    : phase === "idle"
      ? "Start recording"
      : recording
        ? "Stop recording. Press and hold to pause"
        : phase === "paused"
          ? "Resume recording"
          : playing
            ? "Pause playback"
            : "Play your take";

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Behind the button, full width, and only while there is sound to
          draw. A strip that moved when nothing was playing would be the
          decoration this replaced.

          It grows out from under the button rather than appearing: the sound
          starts at the mic, so the strip starts there too. */}
      <AnimatePresence initial={false}>
        {recording || playing ? (
          <motion.div
            key="wave"
            initial={{ opacity: 0, scaleX: 0.25 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0.25 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            /* Centred by the box, not by a transform. `scaleX` is written to
               `transform` inline, which beats Tailwind's `-translate-x-1/2`
               and left the strip starting at the middle and running off the
               right edge of the page. `inset-x-0` with `mx-auto` needs no
               transform, so the animation has it to itself.

               Width is a share of the parent rather than of the viewport:
               `100vw` includes the page's own padding and a scrollbar, so it
               could be wider than the column it sits in. */
            className="pointer-events-none absolute inset-x-0 z-[1] mx-auto w-[min(100%,22rem)]"
          >
            <LiveWaveform
              mode="static"
              active={recording}
              stream={recording ? stream : null}
              element={playing ? playbackElement : null}
              height={64}
              barWidth={3}
              barGap={3}
              barHeight={3}
              sensitivity={1.4}
              className="text-alva-accent"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 520, damping: 22 }}
        onClick={() => {
          /* A hold already did its work; the release must not also stop the
             take it just paused. */
          if (held.current) {
            held.current = false;
            return;
          }
          onPrimary();
        }}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        disabled={disabled}
        aria-label={label}
        className={cn(
          "relative z-[2] transition-opacity",
          disabled && "cursor-not-allowed opacity-40"
        )}
      >
        <div className="relative overflow-visible rounded-full">
          {/* The beam is an invitation to press. Nothing to press, no beam. */}
          {disabled ? (
            <SiriBlob phase={phase} size="md" />
          ) : (
            <BorderBeam
              size="pulse-outside"
              colorVariant="mono"
              theme="dark"
              strength={1}
              duration={recording ? 1.6 : 2.4}
              borderRadius={999}
            >
              <SiriBlob phase={phase} size="md" />
            </BorderBeam>
          )}
        </div>
      </motion.button>
    </div>
  );
}
