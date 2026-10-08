import { cn } from "@/lib/utils";

/** Single-accent textured surface — matches floating nav active pill */
export const alvaAccentTextureClass =
  "relative overflow-hidden bg-alva-accent text-alva-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(circle_at_28%_0%,rgba(255,255,255,0.28),transparent_55%)]";

export function alvaAccentTexture(cnMerge?: string) {
  return cn(alvaAccentTextureClass, cnMerge);
}

/**
 * Dark textured surface, the same treatment as the accent face but on the base
 * dark. Inset top highlight plus a sheen from the top left, so a flat disc on
 * a flat panel picks up an edge and reads as a raised object.
 *
 * The sheen is a `::before`, which paints over non-positioned children, so put
 * the contents in their own `relative z-[1]` wrapper.
 */
export const alvaDarkTextureClass =
  "relative overflow-hidden bg-alva-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_1px_2px_rgba(0,0,0,0.55)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.12),transparent_62%)]";

export function alvaDarkTexture(cnMerge?: string) {
  return cn(alvaDarkTextureClass, cnMerge);
}
