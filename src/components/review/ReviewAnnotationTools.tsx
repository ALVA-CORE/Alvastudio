import {
  ANNOTATION_TOOLS,
  REGION_TAGS,
  type RegionTag,
  type TimestampMarker,
} from "@/data/reviewQueue";
import { cn } from "@/lib/utils";

type ReviewAnnotationToolsProps = {
  markers: TimestampMarker[];
  activeTag: RegionTag;
  onActiveTagChange: (tag: RegionTag) => void;
  onAddMarker: () => void;
  onRemoveMarker: (id: string) => void;
  className?: string;
};

export function ReviewAnnotationTools({
  markers,
  activeTag,
  onActiveTagChange,
  onAddMarker,
  onRemoveMarker,
  className,
}: ReviewAnnotationToolsProps) {
  return (
    <section className={cn("rounded-2xl bg-alva-card p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Annotation tools</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tools needed for speech QA on this product
          </p>
        </div>
        <button
          type="button"
          onClick={onAddMarker}
          className="rounded-full bg-alva-surface px-3 py-1.5 text-xs font-semibold text-alva-accent"
        >
          Mark at playhead
        </button>
      </div>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {ANNOTATION_TOOLS.map((tool) => (
          <li
            key={tool.id}
            className="rounded-xl bg-alva-surface px-3 py-2"
          >
            <p className="text-xs font-semibold text-foreground">{tool.label}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {tool.description}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <p className="text-xs font-semibold text-foreground">Region tags</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {REGION_TAGS.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => onActiveTagChange(tag.id)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                activeTag === tag.id
                  ? "bg-alva-accent text-alva-bg"
                  : "bg-alva-surface text-muted-foreground hover:text-foreground"
              )}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {markers.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {markers.map((marker) => (
            <li
              key={marker.id}
              className="flex items-center justify-between rounded-lg bg-alva-surface px-3 py-2 text-xs"
            >
              <span className="text-foreground">
                {marker.label} · {formatMarkerTime(marker.time)}
              </span>
              <button
                type="button"
                onClick={() => onRemoveMarker(marker.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatMarkerTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
