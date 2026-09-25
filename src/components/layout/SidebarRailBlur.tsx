/**
 * The blur behind a desktop rail.
 *
 * Its own layer rather than a class on the rail itself, because the mask that
 * softens the blur would otherwise fade the icons and labels with it — the
 * expanded rail's labels reach well past the point where the mask starts
 * falling off. Rendered before the nav, so DOM order alone keeps the content
 * on top and no z-index is needed.
 *
 * Shared by the intern, annotator and admin rails so the three cannot drift.
 */
export function SidebarRailBlur() {
  return (
    <div
      aria-hidden
      className="alva-rail-blur pointer-events-none absolute inset-0 backdrop-blur-xl"
    />
  );
}
