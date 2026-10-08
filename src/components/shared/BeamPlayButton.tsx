import Play from "@solar-icons/react/video/Play";
import Pause from "@solar-icons/react/video/Pause";
import { BorderBeam } from "border-beam";
import { alvaDarkTexture } from "@/lib/alva-texture";
import { cn } from "@/lib/utils";

/**
 * The one button on a transport that should be found without looking.
 *
 * It wears the dark textured disc the rest of the product's round controls
 * wear, so it belongs to the same kit, and carries a rotating border beam so
 * it is still the thing the eye lands on without being the only accent-filled
 * shape in the panel. The beam blooms outside the button, which is why every
 * wrapper here is `overflow-visible`: one `overflow-hidden` anywhere in the
 * chain clips the glow back to a flat ring.
 */
export function BeamPlayButton({
  playing,
  onClick,
  disabled = false,
  label,
  className,
}: {
  playing: boolean;
  onClick: () => void;
  disabled?: boolean;
  /** Overrides the default "Play" / "Pause". */
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative shrink-0 overflow-visible rounded-full", className)}>
      <BorderBeam
        size="sm"
        colorVariant="mono"
        theme="dark"
        strength={1}
        duration={2.4}
        borderRadius={999}
        className="overflow-visible rounded-full"
      >
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label ?? (playing ? "Pause" : "Play")}
          className={alvaDarkTexture(
            "relative z-[1] flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:text-alva-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alva-accent disabled:opacity-40"
          )}
        >
          <span className="relative z-[1] flex">
            {playing ? <Pause size={18} weight="Bold" /> : <Play size={18} weight="Bold" />}
          </span>
        </button>
      </BorderBeam>
    </div>
  );
}
