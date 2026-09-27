import { useEffect, useState, type ReactNode } from "react";
import CloseCircle from "@solar-icons/react/ui/CloseCircle";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useResizableSize } from "@/hooks/useResizableSize";
import { cn } from "@/lib/utils";

/**
 * The shell every admin detail panel is built from.
 *
 * Extracted from the users panel once reviews, annotations, sessions and
 * payments all needed the same thing: a resizable sheet with a centred
 * identity block, optional tabs, a scrolling body, and a fixed footer of
 * actions. Five near-copies of that would have drifted apart within a week —
 * and it is exactly the kind of drift a reader notices, because they see all
 * five in one sitting.
 *
 * Panels supply their own header content and tab bodies; everything about how
 * the panel behaves lives here.
 */

export type DetailTab = { id: string; label: string };

const MIN_WIDTH = 460;

export function DetailPanel({
  open,
  onOpenChange,
  /** Read by screen readers as the panel's name. */
  title,
  /** Identity block — avatar, name, status. Centred. */
  header,
  tabs,
  activeTab,
  onTabChange,
  /** Pinned top-left, away from the footer. For the one irreversible action. */
  leading,
  footer,
  children,
  /** Wider than `MIN_WIDTH` when the content needs it, e.g. a year of cells. */
  preferredWidth = 536,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  header: ReactNode;
  tabs?: DetailTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  leading?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  preferredWidth?: number;
}) {
  /* Recomputed on open rather than on every render: the viewport can change
   * while a panel is shut, and clamping against a stale bound would pin it. */
  const [maxWidth, setMaxWidth] = useState(1100);
  useEffect(() => {
    if (!open) return;
    setMaxWidth(Math.min(1100, Math.max(preferredWidth, window.innerWidth - 120)));
  }, [open, preferredWidth]);

  const resize = useResizableSize({
    axis: "x",
    // Handle is on the panel's left edge, so dragging left grows it.
    invert: true,
    preferred: preferredWidth,
    // Never narrower than it wants to be: below this, footers wrap and
    // fixed-width content starts scrolling sideways.
    min: Math.max(MIN_WIDTH, preferredWidth),
    max: maxWidth,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideClose
        aria-describedby={undefined}
        style={{ width: resize.size, maxWidth: "100vw" }}
        /* Radix focuses the first tabbable node on open. That is the resize
           grip, which then wears its focus ring — a bright rule down the edge
           of every panel the first time it opens. The panel takes focus
           instead, which is also the better place to start reading from. */
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement | null)?.focus({ preventScroll: true });
        }}
        tabIndex={-1}
        className="flex max-w-none flex-col gap-0 border-alva-border bg-alva-card p-0"
      >
        {/* Same grip as the annotator's timeline and side panel: an invisible
            strip showing a short pill on hover, rather than a coloured bar
            drawing a rule down the panel's edge at rest. */}
        <div
          role="separator"
          aria-label="Resize panel"
          aria-orientation="vertical"
          aria-valuenow={Math.round(resize.size)}
          aria-valuemin={resize.min}
          aria-valuemax={resize.max}
          tabIndex={0}
          {...resize.handleProps}
          className={cn(
            "group/resize absolute inset-y-0 left-0 z-30 flex w-2 cursor-ew-resize touch-none items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent",
            resize.isResizing && "bg-alva-surface"
          )}
        >
          <span
            aria-hidden
            className={cn(
              "h-8 w-0.5 rounded-full bg-transparent transition-colors group-hover/resize:bg-muted-foreground",
              resize.isResizing && "bg-muted-foreground"
            )}
          />
        </div>

        <div className="relative shrink-0 px-6 pb-0 pt-5">
          {leading ? <div className="absolute left-5 top-4">{leading}</div> : null}

          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="absolute right-6 top-6 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            <CloseCircle size={22} weight="Outline" />
          </button>

          <SheetTitle className="sr-only">{title}</SheetTitle>
          <div className="pt-6">{header}</div>

          {tabs && tabs.length > 1 ? (
            <nav
              aria-label="Detail sections"
              className="mt-5 flex items-center justify-center gap-7 border-b border-alva-border"
            >
              {tabs.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => onTabChange?.(tab.id)}
                    className={cn(
                      "relative -mb-px pb-2.5 text-sm transition-colors focus-visible:outline-none",
                      isActive
                        ? "font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label}
                    {isActive ? (
                      <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-alva-accent" />
                    ) : null}
                  </button>
                );
              })}
            </nav>
          ) : (
            <div className="mt-5 border-b border-alva-border" />
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>

        {footer ? (
          // Fixed to the bottom; only the body scrolls. Buttons size to their
          // own labels rather than stretching to equal thirds.
          <div className="flex shrink-0 items-center gap-2 px-6 pb-5 pt-2">{footer}</div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
