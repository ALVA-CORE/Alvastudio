import { useCallback, useEffect, useRef, useState } from "react";
import WavesurferPlayer from "@wavesurfer/react";
import type WaveSurfer from "wavesurfer.js";
import Rewind5SecondsBack from "@solar-icons/react/video/Rewind5SecondsBack";
import Rewind5SecondsForward from "@solar-icons/react/video/Rewind5SecondsForward";
import { BorderBeam } from "border-beam";
import { Slider } from "@/components/ui/slider";
import { BeamPlayButton } from "@/components/shared/BeamPlayButton";
import { SpeedControl } from "@/components/shared/SpeedControl";
import { formatAudioTime } from "@/hooks/useAudioPlayer";
import { cn } from "@/lib/utils";

type ReviewAudioBarProps = {
  src: string;
  initialPlaybackTime?: number;
  onPlaybackTimeChange?: (time: number) => void;
  className?: string;
};

export function ReviewAudioBar({
  src,
  initialPlaybackTime = 0,
  onPlaybackTimeChange,
  className,
}: ReviewAudioBarProps) {
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const restoredPlaybackRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const handleReady = useCallback(
    (wavesurfer: WaveSurfer) => {
      wavesurferRef.current = wavesurfer;
      const audioDuration = wavesurfer.getDuration();
      setDuration(audioDuration);
      setIsReady(true);
      restoredPlaybackRef.current = false;

      if (initialPlaybackTime > 0) {
        wavesurfer.setTime(Math.min(initialPlaybackTime, audioDuration));
        setCurrentTime(Math.min(initialPlaybackTime, audioDuration));
        restoredPlaybackRef.current = true;
      }
    },
    [initialPlaybackTime]
  );

  useEffect(() => {
    return () => {
      wavesurferRef.current = null;
      setIsReady(false);
      restoredPlaybackRef.current = false;
    };
  }, [src]);

  useEffect(() => {
    onPlaybackTimeChange?.(currentTime);
  }, [currentTime, onPlaybackTimeChange]);

  const togglePlay = () => {
    void wavesurferRef.current?.playPause();
  };

  const skipBy = (seconds: number) => {
    const wavesurfer = wavesurferRef.current;
    if (!wavesurfer) return;
    wavesurfer.setTime(
      Math.max(0, Math.min(wavesurfer.getDuration(), wavesurfer.getCurrentTime() + seconds))
    );
  };

  const seek = (time: number) => {
    wavesurferRef.current?.setTime(time);
  };

  const setRate = (rate: number) => {
    wavesurferRef.current?.setPlaybackRate(rate);
    setPlaybackRate(rate);
  };

  return (
    <section className={cn("rounded-2xl bg-alva-card p-4", className)}>
      <div className="relative overflow-visible rounded-xl p-[3px]">
        <BorderBeam
          size="md"
          colorVariant="mono"
          theme="dark"
          strength={1}
          duration={1.9}
          borderRadius={14}
          className="overflow-visible"
        >
          <div className="relative overflow-hidden rounded-[11px] bg-alva-surface px-2 py-3">
            <WavesurferPlayer
              key={src}
              url={src}
              height={176}
              waveColor="hsl(var(--alva-border))"
              progressColor="#25F07D"
              cursorColor="#25F07D"
              barWidth={3}
              barGap={2}
              barRadius={3}
              normalize
              interact
              onReady={handleReady}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeupdate={(_, time) => setCurrentTime(time)}
            />
          </div>
        </BorderBeam>
      </div>

      <div className="mt-3">
        <Slider
          value={[currentTime]}
          max={duration || 1}
          step={0.1}
          disabled={!isReady}
          onValueChange={([value]) => seek(value)}
        />
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(duration)}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Skip back 5 seconds"
            onClick={() => skipBy(-5)}
            disabled={!isReady}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-alva-surface hover:text-foreground disabled:opacity-40"
          >
            <Rewind5SecondsBack size={18} weight="Outline" />
          </button>

          <BeamPlayButton
            playing={isPlaying}
            onClick={togglePlay}
            disabled={!isReady}
          />

          <button
            type="button"
            aria-label="Skip forward 5 seconds"
            onClick={() => skipBy(5)}
            disabled={!isReady}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-alva-surface hover:text-foreground disabled:opacity-40"
          >
            <Rewind5SecondsForward size={18} weight="Outline" />
          </button>
        </div>

        {/* Same control as the admin clip player: closed it states the rate,
            open it is the full set. Four permanent targets beside the
            transport were four ways to miss the play button. */}
        <SpeedControl value={playbackRate} onChange={setRate} disabled={!isReady} />
      </div>
    </section>
  );
}
