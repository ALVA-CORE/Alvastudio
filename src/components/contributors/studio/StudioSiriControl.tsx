import { AnimatePresence, motion } from "framer-motion";
import Stop from "@solar-icons/react/video/Stop";
import { BorderBeam } from "border-beam";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { cn } from "@/lib/utils";
import type { RecorderPhase } from "@/hooks/useStudioRecorder";
import { SiriBlob } from "./SiriBlob";

type StudioSiriControlProps = {
  phase: RecorderPhase;
  /** The blob: start, pause, resume or replay, depending on the phase. */
  onPrimary: () => void;
  /** Ends the take. Only shown while one is open. */
  onStop?: () => void;
  /** The live capture, so the waveform analyses the take rather than a second mic. */
  stream?: MediaStream | null;
  /** Nothing to record against — the control is inert and says why. */
  disabled?: boolean;
  disabledLabel?: string;
  className?: string;
};

/**
 * The transport. One button at rest, a row once a take is open.
 *
 * At rest the record button sits in the middle and is the only thing to
 * press. Pressing it moves it to the left edge and the row grows a live
 * waveform and a stop button, so the three things somebody needs mid-take —
 * pause, watch the level, stop — are in one line in the order they are
 * reached for.
 *
 * The button itself is smaller than it was. It was the whole composition
 * when it was alone; it is one control among three now.
 *
 * **The waveform reads the recorder's own stream.** It is the take being
 * saved, not a second capture: opening its own would mean two `getUserMedia`
 * grants, two live tracks and two recording indicators in the browser chrome.
 */
export function StudioSiriControl({
  phase,
  onPrimary,
  onStop,
  stream = null,
  disabled = false,
  disabledLabel = "Nothing to record",
  className,
}: StudioSiriControlProps) {
  const open = phase !== "idle";
  const live = phase === "recording";
  /* Stop belongs to a take that is still being made. Once there is a blob,
     the choice is retake or save, and those live in their own row. */
  const capturing = live || phase === "paused";

  const label = disabled
    ? disabledLabel
    : phase === "idle"
      ? "Start recording"
      : phase === "recording"
        ? "Pause recording"
        : phase === "paused"
          ? "Resume recording"
          : phase === "playing"
            ? "Playing recording"
            : "Replay recording";

  return (
    <div className={cn("flex items-center justify-center", className)}>
      {/* `layout` moves the button rather than cutting to the new place: the
          journey from the middle to the left edge is what tells somebody the
          row has become a transport. */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className={cn(
          "flex w-full items-center",
          open ? "justify-start gap-3" : "justify-center"
        )}
      >
        <motion.button
          layout
          type="button"
          onClick={onPrimary}
          disabled={disabled}
          aria-label={label}
          className={cn(
            "relative z-[2] shrink-0 transition-opacity",
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
                duration={live ? 1.6 : 2.4}
                borderRadius={999}
              >
                <SiriBlob phase={phase} size="md" />
              </BorderBeam>
            )}
          </div>
        </motion.button>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="transport"
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              {/* Paused and recorded both hold still rather than going blank:
                  an empty strip where the sound was reads as a dropped mic. */}
              <LiveWaveform
                mode="scrolling"
                active={live}
                stream={live ? stream : null}
                height={56}
                barWidth={3}
                barGap={2}
                barHeight={3}
                historySize={64}
                sensitivity={1.4}
                className="min-w-0 flex-1 text-alva-accent"
              />

              {onStop && capturing ? (
                <button
                  type="button"
                  onClick={onStop}
                  aria-label="Stop recording"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-alva-surface text-foreground transition-colors hover:bg-alva-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
                >
                  <Stop size={18} weight="Bold" />
                </button>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
