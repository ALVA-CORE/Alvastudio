import { lazy, Suspense, useState } from "react";
import { alvaAccentTexture } from "@/lib/alva-texture";
import { cn } from "@/lib/utils";

/**
 * Loaded on demand.
 *
 * The WebGPU runtime behind this is the single largest dependency in the app,
 * and only one card on one face of one dashboard tile uses it. Pulling it into
 * the main bundle would make every contributor download a renderer to look at
 * their points.
 */
const ShapeWaves = lazy(() => import("@/components/ui/backgrounds/ShapeWaves"));

/* ---------------------------------------------------------------------------
 * Field tuning
 *
 * Everything worth nudging by eye is in this one object. Change a number here
 * and nothing else needs touching.
 * ------------------------------------------------------------------------- */
const FIELD = {
  /**
   * How heavy the pattern reads. `ShapeWaves` has no opacity control: the
   * shapes are drawn opaque, so weight is the gap between this and
   * `background`. Darker here = heavier pattern. Lighter = fainter.
   *
   * Keep it mid. The card's own text is near-black, and a shape colour near
   * black puts the field at the same end of the range as the balance.
   */
  color: "#67796E",

  /** Only shows with `interactive`, which is off. Kept so the prop is set. */
  hoverColor: "#8D9A92",

  /** The card itself, behind the shapes. The house accent. */
  background: "#25F07D",

  /**
   * Vignette. 0 is off, **0.45 is the ceiling**: the shader computes
   * `smoothstep(max(0, 1 - fade * 2.2), 1, radius)`, so once `fade` passes
   * 1/2.2 the inner bound is pinned at 0 and larger numbers do nothing.
   */
  fade: 0.45,

  /** Pixels per cell. Lower = finer grain, and more cells to draw. */
  cellSize: 6,

  /** 0 to 1, how much of its cell each shape fills. Higher = denser. */
  dotSize: 0.72,

  /** Drift speed, and the size of the noise the drift is sampled from. */
  speed: 0.5,
  scale: 0.9,

  /** Spread and midpoint of the three shape bands. */
  contrast: 1.05,
  brightness: 0.52,
} as const;

/**
 * The card's animated field.
 *
 * A drifting field of shapes behind the card's own content. No text carved
 * into it: the card already carries a balance, an account number and a mark,
 * and a fourth word competing with them made the field a sign rather than a
 * texture.
 *
 * Three things make this safe to put on a dashboard card. It needs WebGPU, and
 * when that is missing the component reports it and we fall back to the flat
 * accent texture the card used before, which is the same colour, so nothing
 * looks broken. It is `lazy`, so the renderer is only fetched for someone who
 * opens the wallet. And it is not interactive: a global pointermove listener
 * per card buys nothing on a phone, where there is no hover.
 */
export function CardBackdrop({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  /* Loud in dev, silent in production. The fallback is the same colour as the
   * real thing, which is the point, but it also means a broken renderer looks
   * exactly like a working one and nobody finds out for a week. */
  const handleError = (error: Error) => {
    if (import.meta.env.DEV) {
      console.warn(
        "[alva] wallet card fell back to the flat texture. " +
          "WebGPU is unavailable or the renderer failed:",
        error
      );
    }
    setFailed(true);
  };

  if (failed) {
    return <span aria-hidden className={cn(alvaAccentTexture(""), className)} />;
  }

  return (
    <span aria-hidden className={cn("block", className)}>
      <Suspense
        fallback={<span className={cn(alvaAccentTexture(""), "block h-full w-full")} />}
      >
        <ShapeWaves
          shapes="mixed"
          cellSize={FIELD.cellSize}
          dotSize={FIELD.dotSize}
          color={FIELD.color}
          hoverColor={FIELD.hoverColor}
          backgroundColor={FIELD.background}
          speed={FIELD.speed}
          scale={FIELD.scale}
          contrast={FIELD.contrast}
          brightness={FIELD.brightness}
          fade={FIELD.fade}
          glow={0}
          interactive={false}
          intro
          introDuration={1.3}
          onError={handleError}
        />
      </Suspense>
    </span>
  );
}
