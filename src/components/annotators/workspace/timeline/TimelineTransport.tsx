import { memo, useCallback, useEffect, useRef, useState } from "react";
import Pause from "@solar-icons/react/video/Pause";
import Play from "@solar-icons/react/video/Play";
import MagniferZoomIn from "@solar-icons/react/search/MagniferZoomIn";
import MagniferZoomOut from "@solar-icons/react/search/MagniferZoomOut";
import AddCircle from "@solar-icons/react/ui/AddCircle";
import { BorderBeam } from "border-beam";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useAnnotation,
  useAnnotationActions,
  useAnnotationStore,
} from "@/lib/annotation/context";
import { MAX_ZOOM, MIN_ZOOM, PLAYBACK_RATES } from "@/lib/annotation/store";
import { cn } from "@/lib/utils";

/**
 * Timeline transport.
 *
 * Zoom sits on the left, directly under the speaker header column, so the
 * control that scales the tracks lines up with the thing it scales. There is
 * deliberately no time readout here — the playhead carries its own timestamp on
 * the ruler, which is where the eye already is during scrubbing.
 *
 * Each control is its own memoised leaf subscribed to one slice, so nothing in
 * this row repaints while the playhead moves.
 */

const GHOST =
  "flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-alva-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent disabled:pointer-events-none disabled:opacity-40";

/** The shared Slider paints its fill with `--primary` (the accent); that budget
 *  belongs to the play button, so the parts are re-skinned grey from here. */
const GREY_SLIDER = cn(
  "[&>span:first-child]:h-1 [&>span:first-child]:bg-alva-border",
  "[&>span:first-child>span]:bg-muted-foreground",
  "[&_[role=slider]]:size-3 [&_[role=slider]]:border [&_[role=slider]]:border-alva-border [&_[role=slider]]:bg-foreground",
  "[&_[role=slider]]:focus-visible:ring-1 [&_[role=slider]]:focus-visible:ring-alva-accent [&_[role=slider]]:focus-visible:ring-offset-0"
);

const ZoomControl = memo(function ZoomControl() {
  const zoom = useAnnotation((state) => state.zoom);
  const { setZoom } = useAnnotationActions();
  const [scrubbing, setScrubbing] = useState(false);
  const frameRef = useRef(0);

  /* The slider fires per pointer-pixel — faster than a frame, and every write
   * re-lays out the lanes. Coalescing to one write per frame is the difference
   * between a smooth scale and a staircase. */
  const commitZoom = useCallback(
    (next: number) => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = 0;
        setZoom(next);
      });
    },
    [setZoom]
  );

  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <div role="group" aria-label="Timeline zoom" className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => setZoom(zoom / 1.5)}
        className={GHOST}
      >
        <MagniferZoomOut size={15} weight="Bold" />
      </button>

      <div className="relative">
        {/* Reads out the scale while dragging — a slider with no units is a
            guess. Hidden at rest so the row stays quiet. */}
        {scrubbing ? (
          <span className="pointer-events-none absolute bottom-full left-1/2 z-[60] mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-semibold tabular-nums text-alva-bg shadow-md">
            {Math.round(zoom)}px/s
          </span>
        ) : null}

        <Slider
          aria-label="Timeline zoom"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={1}
          value={[zoom]}
          onValueChange={([next]) => commitZoom(next)}
          onPointerDown={() => setScrubbing(true)}
          onPointerUp={() => setScrubbing(false)}
          onPointerCancel={() => setScrubbing(false)}
          onFocus={() => setScrubbing(true)}
          onBlur={() => setScrubbing(false)}
          className={cn("w-24", GREY_SLIDER)}
        />
      </div>

      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => setZoom(zoom * 1.5)}
        className={GHOST}
      >
        <MagniferZoomIn size={15} weight="Bold" />
      </button>
    </div>
  );
});

const RateControl = memo(function RateControl() {
  const playbackRate = useAnnotation((state) => state.playbackRate);
  const { setPlaybackRate } = useAnnotationActions();

  const label = `${Number.isInteger(playbackRate) ? playbackRate.toFixed(1) : playbackRate}x`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Playback speed, currently ${label}`}
          className="rounded-full px-2 py-1 text-xs tabular-nums text-muted-foreground transition-colors hover:bg-alva-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
        >
          {label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-[5rem]">
        {PLAYBACK_RATES.map((rate) => (
          <DropdownMenuItem
            key={rate}
            onSelect={() => setPlaybackRate(rate)}
            className={cn(
              "justify-center text-xs tabular-nums",
              rate === playbackRate && "text-alva-accent"
            )}
          >
            {Number.isInteger(rate) ? rate.toFixed(1) : rate}x
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

const PlayButton = memo(function PlayButton() {
  const isPlaying = useAnnotation((state) => state.isPlaying);
  const { setPlaying } = useAnnotationActions();

  return (
    <div className="relative overflow-visible rounded-full">
      <BorderBeam
        size="pulse-outside"
        colorVariant="mono"
        theme="dark"
        strength={1}
        duration={1.9}
        borderRadius={999}
        className="overflow-visible rounded-full"
      >
        <button
          type="button"
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={() => setPlaying(!isPlaying)}
          className="relative z-[1] flex size-10 items-center justify-center rounded-full bg-alva-accent text-alva-bg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
        >
          {isPlaying ? <Pause size={18} weight="Bold" /> : <Play size={18} weight="Bold" />}
        </button>
      </BorderBeam>
    </div>
  );
});

export const TimelineTransport = memo(function TimelineTransport() {
  const store = useAnnotationStore();
  const { insertSegmentAt } = useAnnotationActions();

  // Reads the playhead at click time rather than subscribing to it.
  const addSegment = useCallback(() => {
    insertSegmentAt(store.getState().currentTime);
  }, [insertSegmentAt, store]);

  return (
    <div className="flex items-center justify-between gap-3 border-t border-alva-border px-3 py-2">
      <div className="flex items-center">
        <ZoomControl />
        {/* Divides the view controls from the transport — they act on different
            things (what you see vs what you hear) and should not read as one row. */}
        <span aria-hidden className="mx-3 h-6 w-px shrink-0 bg-alva-border" />
      </div>

      <div className="flex items-center gap-3">
        <RateControl />
        <PlayButton />
      </div>

      <button
        type="button"
        onClick={addSegment}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-alva-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
      >
        <AddCircle size={15} weight="Outline" />
        Add segment
      </button>
    </div>
  );
});
