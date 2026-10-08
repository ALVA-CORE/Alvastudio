import { useEffect, useRef, useState } from "react";
import Play from "@solar-icons/react/video/Play";
import Pause from "@solar-icons/react/video/Pause";
import Rewind10 from "@solar-icons/react/video/Rewind10SecondsBack";
import Forward10 from "@solar-icons/react/video/Rewind10SecondsForward";
import { cn } from "@/lib/utils";

/** Skip step, in seconds. Enough to get past a false start, short enough to land. */
const SKIP = 10;

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

function clock(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Listen to the clip without leaving the panel.
 *
 * A reviewer's verdict is the only thing the table carries, and an admin
 * checking that verdict has to be able to hear what was being judged. Opening
 * the file somewhere else loses the rubric beside it, which is the comparison
 * being made.
 *
 * Speed control is not a nicety here: most of this audio is conversational
 * Nigerian English and Pidgin, and 1.5x is how anyone gets through forty
 * minutes of it to spot-check one claim.
 */
export function ClipPlayer({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(1);

  // A different clip starts from the top, stopped.
  useEffect(() => {
    setPlaying(false);
    setPosition(0);
    setDuration(0);
  }, [src]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const seek = (to: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Math.min(Math.max(to, 0), duration || audio.duration || 0);
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

  return (
    <div className={cn("rounded-xl bg-alva-surface p-3", className)}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => seek(position - SKIP)}
          aria-label={`Back ${SKIP} seconds`}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-alva-card text-foreground transition-colors hover:text-alva-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alva-accent"
        >
          <Rewind10 size={17} weight="Outline" />
        </button>

        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-alva-accent text-alva-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alva-accent"
        >
          {playing ? <Pause size={17} weight="Bold" /> : <Play size={17} weight="Bold" />}
        </button>

        <button
          type="button"
          onClick={() => seek(position + SKIP)}
          aria-label={`Forward ${SKIP} seconds`}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-alva-card text-foreground transition-colors hover:text-alva-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alva-accent"
        >
          <Forward10 size={17} weight="Outline" />
        </button>

        <span className="ml-1 shrink-0 text-xs tabular-nums text-muted-foreground">
          {clock(position)} / {clock(duration)}
        </span>

        <div
          role="group"
          aria-label="Playback speed"
          className="ml-auto flex shrink-0 items-center gap-0.5 rounded-full bg-alva-card p-0.5"
        >
          {SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={speed === value}
              onClick={() => setSpeed(value)}
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent",
                speed === value
                  ? "bg-alva-accent text-alva-bg"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {value}×
            </button>
          ))}
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={position}
        onChange={(event) => seek(Number(event.target.value))}
        aria-label="Seek"
        className="alva-range mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-alva-border"
      />
    </div>
  );
}
