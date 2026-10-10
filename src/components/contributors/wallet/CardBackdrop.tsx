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

/**
 * Derives the shape colour from the card's own.
 *
 * Same hue, pulled most of the way to grey and down to a fixed lightness, so
 * every card gets a field that belongs to it. Done in JS rather than CSS
 * because the renderer wants a hex string, not a custom property.
 */
function shapeColor(hex: string, lightness: number, saturation: number) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
  }
  hue = (hue * 60 + 360) % 360;

  // Back to RGB at the target lightness and saturation.
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - c / 2;
  const [rp, gp, bp] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];

  const channel = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${channel(rp)}${channel(gp)}${channel(bp)}`;
}

/* ---------------------------------------------------------------------------
 * Field tuning
 *
 * Everything worth nudging by eye is in this one object. Change a number here
 * and nothing else needs touching.
 * ------------------------------------------------------------------------- */
const FIELD = {
  /**
   * How heavy the pattern reads, as a shade of the card's own colour.
   *
   * `ShapeWaves` has no opacity control: the shapes are drawn opaque, so
   * weight is the gap between the shape colour and the background. One fixed
   * grey worked on the accent card and looked like dirt on the amber one, so
   * the shade is derived from whatever colour the card is.
   *
   * Lower `shapeLightness` = heavier pattern. Higher `shapeSaturation` = more
   * of the card's own hue in it. Keep lightness mid: the card's text is
   * near-black, and shapes near black put the field at the same end of the
   * range as the balance.
   */
  shapeLightness: 0.36,
  shapeSaturation: 0.16,

  /** The card itself, behind the shapes. Overridden per card by the stack. */
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
export function CardBackdrop({
  /** The card's own colour. Each bucket in the stack carries its own. */
  background = FIELD.background,
  className,
}: {
  background?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const shape = shapeColor(background, FIELD.shapeLightness, FIELD.shapeSaturation);

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

  /* The flat fallback is the same colour as the real thing, so a card with no
   * WebGPU looks plain rather than broken. */
  const flat = (
    <span
      aria-hidden
      className={cn(alvaAccentTexture("block h-full w-full"), className)}
      style={{ backgroundColor: background }}
    />
  );

  if (failed) return flat;

  return (
    <span aria-hidden className={cn("block", className)}>
      <Suspense fallback={flat}>
        <ShapeWaves
          shapes="mixed"
          cellSize={FIELD.cellSize}
          dotSize={FIELD.dotSize}
          color={shape}
          hoverColor={shape}
          backgroundColor={background}
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
