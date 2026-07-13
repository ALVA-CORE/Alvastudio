import { useEffect, useMemo, useState } from "react";
import Pause from "@solar-icons/react/video/Pause";
import Play from "@solar-icons/react/video/Play";
import Rewind5SecondsBack from "@solar-icons/react/video/Rewind5SecondsBack";
import Rewind5SecondsForward from "@solar-icons/react/video/Rewind5SecondsForward";
import CloseCircle from "@solar-icons/react/ui/CloseCircle";
import { BorderBeam } from "border-beam";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MARKER_COLORS,
  REGION_TAGS,
  type WaveMarker,
} from "@/data/reviewQueue";
import { formatAudioTime, useAudioPlayer } from "@/hooks/useAudioPlayer";
import { cn } from "@/lib/utils";

type ReviewAudioPlayerProps = {
  src: string;
  markers: WaveMarker[];
  onMarkersChange: (markers: WaveMarker[]) => void;
  onTimeUpdate?: (time: number) => void;
  className?: string;
};

function buildWaveform(seed: string, bars = 96) {
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


function getMarkerDescription(marker: WaveMarker) {
  if (marker.tag === "custom") {
    return marker.customText || "Your own note for this timestamp";
  }
  return REGION_TAGS.find((tag) => tag.id === marker.tag)?.description ?? "";
}

export function ReviewAudioPlayer({
  src,
  markers,
  onMarkersChange,
  onTimeUpdate,
  className,
}: ReviewAudioPlayerProps) {
  const player = useAudioPlayer(src);
  const waveform = useMemo(() => buildWaveform(src), [src]);
  const progress = player.duration ? (player.currentTime / player.duration) * 100 : 0;
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);

  useEffect(() => {
    onTimeUpdate?.(player.currentTime);
  }, [player.currentTime, onTimeUpdate]);

  const handleWaveClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!player.duration) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const time = ratio * player.duration;

    player.seek(time);

    const preset = REGION_TAGS[markers.length % REGION_TAGS.length];
    const marker: WaveMarker = {
      id: crypto.randomUUID(),
      time,
      tag: preset.id,
      label: preset.label,
      color: MARKER_COLORS[markers.length % MARKER_COLORS.length],
    };

    onMarkersChange([...markers, marker]);
    setActiveMarkerId(marker.id);
  };

  const updateMarker = (id: string, patch: Partial<WaveMarker>) => {
    onMarkersChange(
      markers.map((marker) => (marker.id === id ? { ...marker, ...patch } : marker))
    );
  };

  const removeMarker = (id: string) => {
    onMarkersChange(markers.filter((marker) => marker.id !== id));
    if (activeMarkerId === id) setActiveMarkerId(null);
  };

  return (
    <section className={cn("relative overflow-visible", className)}>
      <div className="relative overflow-visible rounded-2xl">
        <BorderBeam
          size="md"
          colorVariant="mono"
          theme="dark"
          strength={1}
          duration={1.9}
          borderRadius={16}
        >
          <div className="rounded-2xl bg-alva-card p-4">
            <div
              role="presentation"
              onClick={handleWaveClick}
              className="relative h-44 cursor-crosshair overflow-visible rounded-xl bg-alva-surface px-2 py-4"
            >
              <div className="pointer-events-none flex h-full items-end gap-[2px]">
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

              {markers.map((marker) => {
                const left = player.duration ? (marker.time / player.duration) * 100 : 0;
                const isActive = activeMarkerId === marker.id;
                const displayLabel =
                  marker.tag === "custom" && marker.customText
                    ? marker.customText
                    : marker.label;

                return (
                  <div
                    key={marker.id}
                    className="absolute top-0 z-10 -translate-x-1/2"
                    style={{ left: `${left}%` }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveMarkerId(isActive ? null : marker.id)}
                      className="flex size-3 rounded-full ring-2 ring-alva-bg"
                      style={{ backgroundColor: marker.color, marginTop: "0.35rem" }}
                      aria-label={`Marker at ${formatAudioTime(marker.time)}`}
                    />

                    <div
                      className="absolute bottom-full left-1/2 mb-2 w-52 -translate-x-1/2 rounded-xl bg-alva-card p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                      style={{ borderTop: `3px solid ${marker.color}` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {formatAudioTime(marker.time)}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeMarker(marker.id)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Remove marker"
                        >
                          <CloseCircle size={14} weight="Outline" />
                        </button>
                      </div>

                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="mt-1 cursor-default text-xs font-medium text-foreground">
                              {displayLabel}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-48 border-alva-border bg-alva-card text-xs text-foreground">
                            {getMarkerDescription(marker)}
                          </TooltipContent>
                        </Tooltip>

                        {isActive && (
                          <>
                            <div className="mt-2 flex flex-wrap gap-1">
                            {REGION_TAGS.map((tag) => (
                              <Tooltip key={tag.id}>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateMarker(marker.id, {
                                        tag: tag.id,
                                        label: tag.label,
                                        customText: undefined,
                                      })
                                    }
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                                      marker.tag === tag.id
                                        ? "bg-alva-accent text-alva-bg"
                                        : "bg-alva-surface text-muted-foreground hover:text-foreground"
                                    )}
                                  >
                                    {tag.label}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-48 border-alva-border bg-alva-card text-xs text-foreground">
                                  {tag.description}
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>

                          <input
                            type="text"
                            value={marker.customText ?? ""}
                            placeholder="Custom tag"
                            onChange={(event) =>
                              updateMarker(marker.id, {
                                tag: "custom",
                                label: event.target.value || "Custom",
                                customText: event.target.value,
                              })
                            }
                            className="mt-2 h-8 w-full rounded-lg border-0 bg-alva-surface px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground"
                          />
                          </>
                        )}
                      </TooltipProvider>
                    </div>
                  </div>
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
                <span className="text-center">Click waveform to mark at playhead</span>
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
          </div>
        </BorderBeam>
      </div>
    </section>
  );
}
