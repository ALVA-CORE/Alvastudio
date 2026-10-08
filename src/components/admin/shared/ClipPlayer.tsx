import { useEffect, useRef, useState } from "react";
import Rewind10 from "@solar-icons/react/video/Rewind10SecondsBack";
import Forward10 from "@solar-icons/react/video/Rewind10SecondsForward";
import { BeamPlayButton } from "@/components/shared/BeamPlayButton";
import { SpeedControl } from "@/components/shared/SpeedControl";
import { cn } from "@/lib/utils";

/** Skip step, in seconds. Enough to clear a false start, short enough to land. */
const SKIP = 10;

function clock(seconds: number) {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Listen to the clip without leaving the panel.
 *
 * A reviewer's verdict is the only thing the table carries, and an admin
 * checking that verdict has to be able to hear what was judged. Opening the
 * file elsewhere loses the rubric beside it, which is the comparison being
 * made.
 *
 * Speed is not a nicety here. Most of this audio is conversational Nigerian
 * English and Pidgin, and 1.5x is how anyone gets through forty minutes of it
 * to spot-check one claim.
 *
 * Layout is line first, then controls: speed left, transport centred, clock
 * right. The transport is in its own grid column so the centre does not drift
 * when the clock grows a digit.
 *
 * Only play is a disc. Giving the two skips the same face made three equal
 * targets, and the one you reach for first stopped being obvious.
 */
export function ClipPlayer({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const frameRef = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  /* While the thumb is held, the input owns the position. Letting
   * `timeupdate` write it as well made the thumb fight the finger. */
  const [scrubbing, setScrubbing] = useState(false);

  // A different clip starts from the top, stopped.
  useEffect(() => {
    setPlaying(false);
    setPosition(0);
    setDuration(0);
  }, [src]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  /* `timeupdate` fires about four times a second, which is a visible step on a
   * scrubber. A frame loop reads the same clock at display rate instead. */
  useEffect(() => {
    if (!playing || scrubbing) return;

    const tick = () => {
      const audio = audioRef.current;
      if (audio) setPosition(audio.currentTime);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [playing, scrubbing]);

  const seek = (to: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const limit = duration || audio.duration || 0;
    const next = Math.min(Math.max(to, 0), limit);
    audio.currentTime = next;
    setPosition(next);
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const skipButton =
    "flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alva-accent";

  return (
    <div className={cn("rounded-xl bg-alva-surface p-3", className)}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
      />

      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.01}
        value={position}
        onPointerDown={() => setScrubbing(true)}
        onPointerUp={() => setScrubbing(false)}
        onKeyDown={() => setScrubbing(true)}
        onKeyUp={() => setScrubbing(false)}
        onChange={(event) => seek(Number(event.target.value))}
        aria-label="Seek"
        className="alva-range h-1.5 w-full cursor-pointer appearance-none rounded-full bg-alva-border"
      />

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <SpeedControl value={speed} onChange={setSpeed} className="justify-self-start" />

        <div className="flex items-center gap-2 justify-self-center overflow-visible">
          <button
            type="button"
            onClick={() => seek(position - SKIP)}
            aria-label={`Back ${SKIP} seconds`}
            className={skipButton}
          >
            <Rewind10 size={18} weight="Outline" />
          </button>

          <BeamPlayButton playing={playing} onClick={toggle} />

          <button
            type="button"
            onClick={() => seek(position + SKIP)}
            aria-label={`Forward ${SKIP} seconds`}
            className={skipButton}
          >
            <Forward10 size={18} weight="Outline" />
          </button>
        </div>

        <span className="justify-self-end text-xs tabular-nums text-muted-foreground">
          {clock(position)} / {clock(duration)}
        </span>
      </div>
    </div>
  );
}
