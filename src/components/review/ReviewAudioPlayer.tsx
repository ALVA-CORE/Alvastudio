import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WavesurferPlayer from "@wavesurfer/react";
import RegionsPlugin, { type Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import type WaveSurfer from "wavesurfer.js";
import Pause from "@solar-icons/react/video/Pause";
import Play from "@solar-icons/react/video/Play";
import Rewind5SecondsBack from "@solar-icons/react/video/Rewind5SecondsBack";
import Rewind5SecondsForward from "@solar-icons/react/video/Rewind5SecondsForward";
import Pen2 from "@solar-icons/react/messages/Pen2";
import CloseCircle from "@solar-icons/react/ui/CloseCircle";
import { BorderBeam } from "border-beam";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  MARKER_COLORS,
  REGION_TAGS,
  colorWithAlpha,
  type AudioRegion,
} from "@/data/reviewQueue";
import { formatAudioTime } from "@/hooks/useAudioPlayer";
import { cn } from "@/lib/utils";

type ReviewAudioPlayerProps = {
  src: string;
  regions: AudioRegion[];
  onRegionsChange: (regions: AudioRegion[]) => void;
  initialPlaybackTime?: number;
  onPlaybackTimeChange?: (time: number) => void;
  className?: string;
};

function regionLabel(region: AudioRegion) {
  if (region.tag === "custom" && region.customText) return region.customText;
  return region.label;
}

function RegionTagEditor({
  region,
  onUpdate,
  onDelete,
}: {
  region: AudioRegion;
  onUpdate: (patch: Partial<AudioRegion>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {formatAudioTime(region.start)} – {formatAudioTime(region.end)}
      </p>

      <div className="flex flex-wrap gap-1">
        {REGION_TAGS.map((tag) => (
          <button
            key={tag.id}
            type="button"
            title={tag.description}
            onClick={() =>
              onUpdate({
                tag: tag.id,
                label: tag.label,
                customText: undefined,
              })
            }
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
              region.tag === tag.id
                ? "bg-alva-accent text-alva-bg"
                : "bg-alva-surface text-muted-foreground hover:text-foreground"
            )}
          >
            {tag.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={region.customText ?? ""}
        placeholder="Custom tag"
        onChange={(event) =>
          onUpdate({
            tag: "custom",
            label: event.target.value || "Custom",
            customText: event.target.value,
          })
        }
        className="h-8 w-full rounded-lg border-0 bg-alva-surface px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground"
      />

      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <CloseCircle size={14} weight="Outline" />
        Remove highlight
      </button>
    </div>
  );
}

export function ReviewAudioPlayer({
  src,
  regions,
  onRegionsChange,
  initialPlaybackTime = 0,
  onPlaybackTimeChange,
  className,
}: ReviewAudioPlayerProps) {
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<RegionsPlugin | null>(null);
  const regionsRef = useRef(regions);
  const onRegionsChangeRef = useRef(onRegionsChange);
  const syncingRef = useRef(false);
  const regionMapRef = useRef(new Map<string, Region>());
  const restoredPlaybackRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);

  regionsRef.current = regions;
  onRegionsChangeRef.current = onRegionsChange;

  const plugins = useMemo(() => {
    const plugin = RegionsPlugin.create();
    regionsPluginRef.current = plugin;
    return [plugin];
  }, []);

  const syncRegionsToPlugin = useCallback(() => {
    const plugin = regionsPluginRef.current;
    if (!plugin) return;

    syncingRef.current = true;
    plugin.clearRegions();
    regionMapRef.current.clear();

    regionsRef.current.forEach((entry) => {
      const region = plugin.addRegion({
        id: entry.id,
        start: entry.start,
        end: entry.end,
        color: colorWithAlpha(entry.color, 0.42),
        resize: true,
        drag: true,
      });
      regionMapRef.current.set(entry.id, region);
    });

    syncingRef.current = false;
  }, []);

  const upsertRegion = useCallback((entry: AudioRegion) => {
    onRegionsChangeRef.current(
      regionsRef.current.some((region) => region.id === entry.id)
        ? regionsRef.current.map((region) => (region.id === entry.id ? entry : region))
        : [...regionsRef.current, entry]
    );
  }, []);

  const removeRegion = useCallback((id: string) => {
    onRegionsChangeRef.current(regionsRef.current.filter((region) => region.id !== id));
    if (editingRegionId === id) setEditingRegionId(null);
  }, [editingRegionId]);

  const handleReady = useCallback(
    (wavesurfer: WaveSurfer) => {
      wavesurferRef.current = wavesurfer;
      const audioDuration = wavesurfer.getDuration();
      setDuration(audioDuration);
      setIsReady(true);
      restoredPlaybackRef.current = false;

      const plugin = regionsPluginRef.current;
      if (!plugin) return;

      syncRegionsToPlugin();
      plugin.enableDragSelection({
        minLength: 0.12,
        resize: true,
        drag: true,
        color: colorWithAlpha(MARKER_COLORS[0], 0.42),
      });

      plugin.on("region-created", (region) => {
        if (syncingRef.current) return;

        const preset = REGION_TAGS[regionsRef.current.length % REGION_TAGS.length];
        const color = MARKER_COLORS[regionsRef.current.length % MARKER_COLORS.length];
        const id = crypto.randomUUID();

        region.setOptions({
          id,
          color: colorWithAlpha(color, 0.42),
        });

        const entry: AudioRegion = {
          id,
          start: region.start,
          end: region.end,
          tag: preset.id,
          label: preset.label,
          color,
        };

        regionMapRef.current.set(id, region);
        upsertRegion(entry);
      });

      plugin.on("region-updated", (region) => {
        if (syncingRef.current) return;

        const existing = regionsRef.current.find((entry) => entry.id === region.id);
        if (!existing) return;

        upsertRegion({
          ...existing,
          start: region.start,
          end: region.end,
        });
      });

      plugin.on("region-removed", (region) => {
        if (syncingRef.current) return;
        regionMapRef.current.delete(region.id);
        removeRegion(region.id);
      });

      if (initialPlaybackTime > 0) {
        wavesurfer.setTime(Math.min(initialPlaybackTime, audioDuration));
        setCurrentTime(Math.min(initialPlaybackTime, audioDuration));
        restoredPlaybackRef.current = true;
      }
    },
    [initialPlaybackTime, removeRegion, syncRegionsToPlugin, upsertRegion]
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

  const updateRegion = (id: string, patch: Partial<AudioRegion>) => {
    const existing = regions.find((region) => region.id === id);
    if (!existing) return;

    const next = { ...existing, ...patch };
    upsertRegion(next);

    const pluginRegion = regionMapRef.current.get(id);
    pluginRegion?.setOptions({
      color: colorWithAlpha(next.color, 0.42),
    });
  };

  const deleteRegion = (id: string) => {
    regionMapRef.current.get(id)?.remove();
  };

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
          <div className="relative overflow-visible rounded-[11px] bg-alva-surface px-2 py-3">
            {duration > 0 && regions.length > 0 && (
              <div className="relative mb-2 h-6 w-full overflow-visible">
                {regions.map((region) => {
                  const left = (region.start / duration) * 100;
                  const width = Math.max(((region.end - region.start) / duration) * 100, 0.5);
                  const isEditing = editingRegionId === region.id;

                  return (
                    <div
                      key={region.id}
                      className="pointer-events-none absolute top-0 h-full"
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <div className="pointer-events-auto absolute right-0 top-0 z-20 flex items-center gap-0.5">
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold leading-none text-alva-bg shadow-sm"
                          style={{ backgroundColor: region.color }}
                        >
                          {regionLabel(region)}
                        </span>

                        <Popover
                          open={isEditing}
                          onOpenChange={(open) => setEditingRegionId(open ? region.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="flex size-4 items-center justify-center rounded-md text-alva-bg shadow-sm"
                              style={{ backgroundColor: region.color }}
                              aria-label={`Edit tag for ${regionLabel(region)}`}
                            >
                              <Pen2 size={10} weight="Bold" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="end"
                            className="w-56 rounded-xl border-alva-border bg-alva-card p-2"
                          >
                            <RegionTagEditor
                              region={region}
                              onUpdate={(patch) => updateRegion(region.id, patch)}
                              onDelete={() => deleteRegion(region.id)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="relative overflow-hidden rounded-lg">
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
                plugins={plugins}
                onReady={handleReady}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeupdate={(_, time) => setCurrentTime(time)}
              />
            </div>
          </div>
        </BorderBeam>
      </div>

      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Drag on the waveform to highlight a segment
      </p>

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
                onClick={togglePlay}
                disabled={!isReady}
                className="relative z-[1] flex size-11 items-center justify-center rounded-full bg-alva-accent text-alva-bg disabled:opacity-40"
              >
                {isPlaying ? <Pause size={20} weight="Bold" /> : <Play size={20} weight="Bold" />}
              </button>
            </BorderBeam>
          </div>

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

        <ToggleGroup
          type="single"
          value={String(playbackRate)}
          onValueChange={(value) => {
            if (value) setRate(Number(value));
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
