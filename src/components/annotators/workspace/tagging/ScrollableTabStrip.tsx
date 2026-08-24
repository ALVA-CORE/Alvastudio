import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import AltArrowRight from "@solar-icons/react/arrows/AltArrowRight";
import AltArrowLeft from "@solar-icons/react/arrows/AltArrowLeft";
import { cn } from "@/lib/utils";

/**
 * A horizontally scrolling strip that says so.
 *
 * A row that merely overflows gives no sign there is more to its right — the
 * content just stops at the edge and reads as the whole set. This adds a fade
 * and an arrow at whichever end still has content, so the affordance appears
 * only when scrolling is actually possible and disappears at each end.
 */

export type ScrollableTabStripProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

/** Slack before an edge counts as reached, absorbing sub-pixel scroll offsets. */
const EDGE_EPSILON = 4;

export function ScrollableTabStrip({
  label,
  children,
  className,
}: ScrollableTabStripProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;

    const max = node.scrollWidth - node.clientWidth;
    setEdges({
      start: node.scrollLeft > EDGE_EPSILON,
      end: max > EDGE_EPSILON && node.scrollLeft < max - EDGE_EPSILON,
    });
  }, []);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;

    measure();
    node.addEventListener("scroll", measure, { passive: true });

    // Tabs appear and disappear as categories gain and lose their last tag, and
    // the panel itself is resizable — both change whether this can scroll.
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const child of Array.from(node.children)) observer.observe(child);

    return () => {
      node.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure, children]);

  const nudge = (direction: 1 | -1) => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth * 0.7, behavior: "smooth" });
  };

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scrollerRef}
        role="tablist"
        aria-label={label}
        // Scrollbar hidden: the fade and arrow carry the affordance, and a
        // horizontal bar under a 28px-tall strip is thicker than the strip.
        className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      {edges.start && <EdgeControl side="start" onClick={() => nudge(-1)} />}
      {edges.end && <EdgeControl side="end" onClick={() => nudge(1)} />}
    </div>
  );
}

function EdgeControl({
  side,
  onClick,
}: {
  side: "start" | "end";
  onClick: () => void;
}) {
  const isEnd = side === "end";

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      onClick={onClick}
      className={cn(
        "absolute top-0 bottom-1 flex w-9 items-center",
        isEnd
          ? "right-0 justify-end bg-gradient-to-l from-alva-card via-alva-card/85 to-transparent pr-0.5"
          : "left-0 justify-start bg-gradient-to-r from-alva-card via-alva-card/85 to-transparent pl-0.5"
      )}
    >
      <span className="flex size-5 items-center justify-center rounded-full bg-alva-surface text-muted-foreground">
        {isEnd ? (
          <AltArrowRight size={12} weight="Linear" />
        ) : (
          <AltArrowLeft size={12} weight="Linear" />
        )}
      </span>
    </button>
  );
}
