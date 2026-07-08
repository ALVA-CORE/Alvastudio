import { cn } from "@/lib/utils";

/** Single-accent textured surface — matches floating nav active pill */
export const alvaAccentTextureClass =
  "relative overflow-hidden bg-alva-accent text-alva-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(circle_at_28%_0%,rgba(255,255,255,0.28),transparent_55%)]";

export function alvaAccentTexture(cnMerge?: string) {
  return cn(alvaAccentTextureClass, cnMerge);
}
