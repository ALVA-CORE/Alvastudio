import type { ReactNode } from "react";
import { VoiceBeam } from "voice-glow";
import type { RecorderPhase } from "@/hooks/useStudioRecorder";
import { cn } from "@/lib/utils";

/**
 * Lobe palette.
 *
 * The library's own `forest` variant brings teals that are not in this design
 * system, which allows exactly one accent. This is a symmetric ramp around
 * `#25F07D` — brightest in the middle, darkening outward — so the beam reads as
 * depth in the accent rather than as a second colour.
 */
const ALVA_BEAM_COLORS = [
  "#0B7A44",
  "#14B462",
  "#25F07D",
  "#7DFAB6",
  "#25F07D",
  "#14B462",
  "#0B7A44",
];

type StudioVoiceBeamProps = {
  /** The recorder's live capture. Null when nothing is being recorded. */
  stream: MediaStream | null;
  phase: RecorderPhase;
  /** Gathers the glow into a travelling beam — wired to upload, not recording. */
  processing?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Sound-reactive glow along the bottom of the record surface.
 *
 * Shared by both record pages so the two cannot drift apart. It is driven by
 * the recorder's own `MediaStream` rather than the library's `useMicrophone`,
 * so there is one capture, one permission prompt, and the glow reacts to
 * exactly the audio going into the take.
 *
 * One consequence worth knowing: the recorder asks for `{ audio: true }`, so
 * the browser's auto gain control is on and levels the signal. `useMicrophone`
 * would have turned it off for livelier dynamics — but those constraints also
 * shape the recorded audio, which is a data-collection decision, not a visual
 * one. `sensitivity` compensates instead.
 */
export function StudioVoiceBeam({
  stream,
  phase,
  processing = false,
  className,
  children,
}: StudioVoiceBeamProps) {
  return (
    <VoiceBeam
      type="mobile"
      stream={stream}
      processing={processing}
      /* Nothing to react to at rest, so the beam stays down until there is. */
      active={phase === "recording" || processing}
      colors={ALVA_BEAM_COLORS}
      theme="dark"
      sensitivity={4.2}
      className={cn("flex min-h-full flex-col", className)}
    >
      {children}
    </VoiceBeam>
  );
}
