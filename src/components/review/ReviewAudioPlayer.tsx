import { useEffect, useMemo } from "react";
import Pause from "@solar-icons/react/video/Pause";
import Play from "@solar-icons/react/video/Play";
import Rewind5SecondsBack from "@solar-icons/react/video/Rewind5SecondsBack";
import Rewind5SecondsForward from "@solar-icons/react/video/Rewind5SecondsForward";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatAudioTime, useAudioPlayer } from "@/hooks/useAudioPlayer";
import { cn } from "@/lib/utils";

type ReviewAudioPlayerProps = {
  src: string;
  markers?: number[];
  onTimeUpdate?: (time: number) => void;
  className?: string;
};

function buildWaveform(seed: string, bars = 72) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  return Array.from({ length: bars }, (_, index) => {
    const value = Math.abs(Math.sin((hash + index) * 0.62) * 0.55 + Math.cos(index * 0.31) * 0.35);
    return 0.25 + value * 0.75;
  });
}

export function ReviewAudioPlayer({
  src,
  markers = [],
  onTimeUpdate,
  className,
}: ReviewAudioPlayerProps) {
  const player = useAudioPlayer(src);
  const waveform = useMemo(() => buildWaveform(src), [src]);
  const progress = player.duration ? (player.currentTime / player.duration) * 100 : 0;

  useEffect(() => {
    onTimeUpdate?.(player.currentTime);
  }, [player.currentTime, onTimeUpdate]);

  return (
    <section className={cn("rounded-2xl bg-alva-card p-4", className)}>
      <div className="relative h-24 overflow-hidden rounded-xl bg-alva-surface px-2 py-3">
        <div className="flex h-full items-end gap-[3px]">
          {waveform.map((height, index) => {
            const barProgress = (index / waveform.length) * 100;
            const isPlayed = barProgress <= progress;

            return (
              <span
                key={index}
                className={cn(
                  "flex-1 rounded-full transition-colors",
                  isPlayed ? "bg-alva-accent" : "bg-alva-border"
                )}
                style={{ height: `${height * 100}%` }}
              />
            );
          })}
        </div>

        {markers.map((time) => {
          const left = player.duration ? (time / player.duration) * 100 : 0;
          return (
            <span
              key={time}
              className="absolute bottom-2 top-2 w-0.5 rounded-full bg-destructive"
              style={{ left: `calc(${left}% + 0.5rem)` }}
            />
          );
        })}
      </div>

      <div className="mt-3">
        <Slider
          value={[player.currentTime]}
          max={player.duration || 1}
          step={0.1}
          onValueChange={([value]) => player.seek(value)}
        />
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>{formatAudioTime(player.currentTime)}</span>
          <span>{formatAudioTime(player.duration)}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Skip back 5 seconds"
            onClick={() => player.skipBy(-5)}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-alva-surface hover:text-foreground"
          >
            <Rewind5SecondsBack size={18} weight="Outline" />
          </button>

          <button
            type="button"
            aria-label={player.isPlaying ? "Pause" : "Play"}
            onClick={() => void player.togglePlay()}
            className="flex size-11 items-center justify-center rounded-full bg-alva-accent text-alva-bg"
          >
            {player.isPlaying ? (
              <Pause size={20} weight="Bold" />
            ) : (
              <Play size={20} weight="Bold" />
            )}
          </button>

          <button
            type="button"
            aria-label="Skip forward 5 seconds"
            onClick={() => player.skipBy(5)}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-alva-surface hover:text-foreground"
          >
            <Rewind5SecondsForward size={18} weight="Outline" />
          </button>
        </div>

        <ToggleGroup
          type="single"
          value={String(player.playbackRate)}
          onValueChange={(value) => {
            if (value) player.setPlaybackRate(Number(value));
          }}
          className="rounded-full bg-alva-surface p-1"
        >
          {["0.75", "1", "1.25", "1.5"].map((rate) => (
            <ToggleGroupItem
              key={rate}
              value={rate}
              className="h-7 rounded-full px-2.5 text-xs data-[state=on]:bg-alva-card data-[state=on]:text-alva-accent"
            >
              {rate}x
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </section>
  );
}
