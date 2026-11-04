import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Monitor from "@solar-icons/react/devices/Monitor";
import Smartphone from "@solar-icons/react/devices/Smartphone";
import { cn } from "@/lib/utils";

type Width = "desktop" | "mobile";

const WIDTHS = [
  { value: "desktop", label: "Desktop", Icon: Monitor },
  { value: "mobile", label: "Mobile", Icon: Smartphone },
] as const;

/** The width an inbox gives the email: the layout's own 560px, plus room. */
const FRAME_WIDTH: Record<Width, number> = { desktop: 620, mobile: 375 };

/**
 * Below this the copy is too small to read, so a long email stops shrinking
 * and scrolls instead.
 */
const MIN_SCALE = 0.62;

/**
 * An email, drawn as an inbox would draw it, scaled to fit.
 *
 * The frame is laid out at a real inbox width, measured, and shrunk until the
 * whole email fits the space it has. Only a body long enough to need less
 * than `MIN_SCALE` scrolls.
 *
 * `sandbox="allow-same-origin"` and nothing else: no scripts, forms, popups
 * or navigation, but the page can read the email's height, which is what the
 * fit needs. Pointer events are off on the frame, so a link in the preview
 * cannot load another site inside it; scrolling happens on the wrapper.
 */
export function EmailPreviewFrame({ html, className }: { html: string; className?: string }) {
  const [width, setWidth] = useState<Width>("desktop");
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [space, setSpace] = useState({ width: 0, height: 0 });
  const [contentHeight, setContentHeight] = useState(900);

  useLayoutEffect(() => {
    const node = box.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setSpace({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /* Measured on every load, which a new `srcDoc` or width causes, and again
     as images arrive, since the hero changes the height when it lands. */
  const measure = () => {
    const doc = frame.current?.contentDocument;
    if (!doc?.body) return;
    const next = Math.ceil(doc.body.scrollHeight);
    if (next > 0) setContentHeight(next);
  };

  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    const images = Array.from(doc.images);
    images.forEach((image) => image.addEventListener("load", measure));
    return () => images.forEach((image) => image.removeEventListener("load", measure));
  });

  const frameWidth = FRAME_WIDTH[width];
  const byWidth = space.width ? space.width / frameWidth : 1;
  const byHeight = space.height ? space.height / contentHeight : 1;
  const scale = Math.min(1, byWidth, Math.max(MIN_SCALE, byHeight));

  return (
    <div className={cn("relative h-full overflow-hidden rounded-2xl bg-[#090909]", className)}>
      <div ref={box} className="alva-thin-scrollbar absolute inset-0 overflow-y-auto overflow-x-hidden">
        <motion.div
          initial={false}
          animate={{ width: frameWidth * scale, height: contentHeight * scale }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="relative mx-auto"
        >
          <iframe
            ref={frame}
            key={width}
            title="Email preview"
            sandbox="allow-same-origin"
            srcDoc={html}
            onLoad={measure}
            style={{
              width: frameWidth,
              height: contentHeight,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
            className="pointer-events-none absolute left-0 top-0 border-0 transition-transform duration-300"
          />
        </motion.div>
      </div>

      <div
        role="radiogroup"
        aria-label="Preview width"
        className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-alva-border bg-alva-card/90 p-1 shadow-lg backdrop-blur"
      >
        {WIDTHS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={width === value}
            aria-label={label}
            onClick={() => setWidth(value)}
            className="relative flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors aria-checked:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            {width === value ? (
              <motion.span
                layoutId="comms-preview-width"
                className="absolute inset-0 rounded-full bg-alva-surface"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            ) : null}
            <Icon size={16} weight="Outline" className="relative" />
          </button>
        ))}
      </div>
    </div>
  );
}
