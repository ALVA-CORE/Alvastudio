import { VoiceBeam } from "voice-glow";
import type { RecorderPhase } from "@/hooks/useStudioRecorder";

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

/**
 * How tall the host box is.
 *
 * The glow is painted inside the host and clipped by its `overflow: hidden`,
 * blooming upward from the bottom edge. The `mobile` preset runs at scale 1.25
 * with a 2.1x glow height, so this needs headroom — and `.alva-beam-fade`
 * softens whatever still reaches the ceiling on a loud syllable.
 *
 * Kept in step with the rail blur's bottom clearance in index.css: that mask
 * stops 17rem from the bottom so it never smears this band.
 */
const HOST_HEIGHT = "h-64";

type StudioVoiceBeamProps = {
  /** The recorder's live capture. Null when nothing is being recorded. */
  stream: MediaStream | null;
  phase: RecorderPhase;
  /** Gathers the glow into a travelling beam — wired to upload, not recording. */
  processing?: boolean;
};

/**
 * Sound-reactive glow along the bottom of the viewport.
 *
 * Fixed to the screen rather than wrapping the page. Wrapping made the glow
 * follow the content box — on the intern page that box is centred and width-
 * capped, and a Radix modal's scroll lock changes its width, so the geometry
 * was re-measured mid-animation and jittered. A viewport-fixed host has no such
 * dependency, and it puts the beam at the bottom of the screen on desktop as
 * well as on a phone.
 *
 * Driven by the recorder's own `MediaStream` rather than the library's
 * `useMicrophone`, so there is one capture, one permission prompt, and the glow
 * reacts to exactly the audio going into the take.
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
}: StudioVoiceBeamProps) {
  return (
    <div
      aria-hidden
      className={`alva-beam-fade pointer-events-none fixed inset-x-0 bottom-0 z-30 ${HOST_HEIGHT}`}
    >
      <VoiceBeam
        type="mobile"
        stream={stream}
        processing={processing}
        /* Nothing to react to at rest, so the beam stays down until there is. */
        active={phase === "recording" || processing}
        colors={ALVA_BEAM_COLORS}
        theme="dark"
        sensitivity={4.2}
        /* Square. Left to itself it reads the first child's computed radius,
           and the bottom corners of the screen are not rounded. */
        borderRadius={0}
        className="h-full w-full"
      >
        <div className="h-full w-full" />
      </VoiceBeam>
    </div>
  );
}
