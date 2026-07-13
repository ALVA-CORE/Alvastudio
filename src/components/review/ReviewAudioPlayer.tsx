import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WavesurferPlayer from "@wavesurfer/react";
import RegionsPlugin, { type Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import type WaveSurfer from "wavesurfer.js";
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
  colorWithAlpha,
  type AudioRegion,
} from "@/data/reviewQueue";
import { formatAudioTime } from "@/hooks/useAudioPlayer";
import { cn } from "@/lib/utils";

type ReviewAudioPlayerProps = {
  src: string;
  regions: AudioRegion[];
  onRegionsChange: (regions: AudioRegion[]) => void;
  className?: string;
};

function getRegionDescription(region: AudioRegion) {
  if (region.tag === "custom") {
    return region.customText || "Your own note for this segment";
  }
  return REGION_TAGS.find((tag) => tag.id === region.tag)?.description ?? "";
}

function regionLabel(region: AudioRegion) {
  if (region.tag === "custom" && region.customText) return region.customText;
  return region.label;
}

export function ReviewAudioPlayer({
  src,
  regions,
  onRegionsChange,
  className,
}: ReviewAudioPlayerProps) {
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<RegionsPlugin | null>(null);
  const regionsRef = useRef(regions);
  const onRegionsChangeRef = useRef(onRegionsChange);
  const syncingRef = useRef(false);
  const regionMapRef = useRef(new Map<string, Region>());

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);

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
        color: colorWithAlpha(entry.color),
        resize: true,
        drag: true,
        content: regionLabel(entry),
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
    if (activeRegionId === id) setActiveRegionId(null);
  }, [activeRegionId]);

  const handleReady = useCallback(
    (wavesurfer: WaveSurfer) => {
      wavesurferRef.current = wavesurfer;
      setDuration(wavesurfer.getDuration());
      setIsReady(true);

      const plugin = regionsPluginRef.current;
      if (!plugin) return;

      syncRegionsToPlugin();
      plugin.enableDragSelection({
        minLength: 0.12,
        resize: true,
        drag: true,
        color: colorWithAlpha(MARKER_COLORS[0]),
      });

      plugin.on("region-created", (region) => {
        if (syncingRef.current) return;

        const preset = REGION_TAGS[regionsRef.current.length % REGION_TAGS.length];
        const color = MARKER_COLORS[regionsRef.current.length % MARKER_COLORS.length];
        const id = crypto.randomUUID();

        region.setOptions({
          id,
          color: colorWithAlpha(color),
          content: preset.label,
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
        setActiveRegionId(id);
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

      plugin.on("region-clicked", (region) => {
        setActiveRegionId((current) => (current === region.id ? null : region.id));
      });
    },
    [removeRegion, syncRegionsToPlugin, upsertRegion]
  );

  useEffect(() => {
    return () => {
      wavesurferRef.current = null;
      setIsReady(false);
    };
  }, [src]);

  const activeRegion = regions.find((region) => region.id === activeRegionId);

  const updateActiveRegion = (patch: Partial<AudioRegion>) => {
    if (!activeRegion) return;

    const next = { ...activeRegion, ...patch };
    upsertRegion(next);

    const pluginRegion = regionMapRef.current.get(activeRegion.id);
    pluginRegion?.setOptions({
      color: colorWithAlpha(next.color),
      content: regionLabel(next),
    });
  };

  const deleteActiveRegion = () => {
    if (!activeRegion) return;
    regionMapRef.current.get(activeRegion.id)?.remove();
  };

  const togglePlay = () => {
    void wavesurferRef.current?.playPause();
  };

  const skipBy = (seconds: number) => {
    const wavesurfer = wavesurferRef.current;
    if (!wavesurfer) return;
    wavesurfer.setTime(Math.max(0, Math.min(wavesurfer.getDuration(), wavesurfer.getCurrentTime() + seconds)));
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
      <div className="relative overflow-visible rounded-xl">
        <BorderBeam
          size="md"
          colorVariant="mono"
          theme="dark"
          strength={1}
          duration={1.9}
          borderRadius={12}
        >
          <div className="overflow-hidden rounded-xl bg-alva-surface px-2 py-3">
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
        </BorderBeam>
      </div>

      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Drag on the waveform to highlight a segment
      </p>

      {activeRegion && (
        <div
          className="mt-3 rounded-xl bg-alva-surface p-3"
          style={{ borderTop: `3px solid ${activeRegion.color}` }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {formatAudioTime(activeRegion.start)} – {formatAudioTime(activeRegion.end)}
              </p>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="mt-1 cursor-default text-sm font-medium text-foreground">
                      {regionLabel(activeRegion)}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-48 border-alva-border bg-alva-card text-xs text-foreground">
                    {getRegionDescription(activeRegion)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <button
              type="button"
              onClick={deleteActiveRegion}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Remove highlight"
            >
              <CloseCircle size={16} weight="Outline" />
            </button>
          </div>

          <TooltipProvider delayDuration={100}>
            <div className="mt-2 flex flex-wrap gap-1">
              {REGION_TAGS.map((tag) => (
                <Tooltip key={tag.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveRegion({
                          tag: tag.id,
                          label: tag.label,
                          customText: undefined,
                        })
                      }
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                        activeRegion.tag === tag.id
                          ? "bg-alva-accent text-alva-bg"
                          : "bg-alva-card text-muted-foreground hover:text-foreground"
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
          </TooltipProvider>

          <input
            type="text"
            value={activeRegion.customText ?? ""}
            placeholder="Custom tag"
            onChange={(event) =>
              updateActiveRegion({
                tag: "custom",
                label: event.target.value || "Custom",
                customText: event.target.value,
              })
            }
            className="mt-2 h-8 w-full rounded-lg border-0 bg-alva-card px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      )}

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

          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={togglePlay}
            disabled={!isReady}
            className="flex size-11 items-center justify-center rounded-full bg-alva-accent text-alva-bg disabled:opacity-40"
          >
            {isPlaying ? <Pause size={20} weight="Bold" /> : <Play size={20} weight="Bold" />}
          </button>

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
