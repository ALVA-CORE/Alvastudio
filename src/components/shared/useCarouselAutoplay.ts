import { useEffect, useRef, useState } from "react";
import type { CarouselApi } from "@/components/ui/carousel";

/** How long each slide holds. */
const ADVANCE_MS = 5000;
/** How long a touch buys before it starts again. */
const RESUME_MS = 8000;

/**
 * Advances a carousel on its own, and gets out of the way when touched.
 *
 * **It pauses, it does not stop.** The first version stopped for good on
 * `pointerDown`, reasoning that somebody who has swiped is reading one slide
 * rather than watching all of them. The flaw is that `pointerDown` fires for
 * *any* finger landing on the carousel, including one that is about to
 * scroll the page vertically past it — which on a phone is most of them. So
 * autoplay died on the first touch of the dashboard and never came back,
 * which is how it ended up looking like a feature that had been removed.
 *
 * Embla has no "the user actually dragged this" event to key off, so the fix
 * is to stop guessing intent: any touch buys quiet for a while, and then it
 * resumes. Somebody genuinely reading one slide keeps their finger near it
 * and keeps the quiet going; somebody who brushed past it on the way down
 * the page gets their carousel back.
 *
 * It also holds while the tab is hidden, so returning does not land on
 * whatever happened to be showing after forty silent rotations.
 */
export function useCarouselAutoplay(api: CarouselApi) {
  const [quiet, setQuiet] = useState(false);
  const resume = useRef(0);

  useEffect(() => {
    if (!api) return;

    const hush = () => {
      window.clearTimeout(resume.current);
      setQuiet(true);
    };

    const release = () => {
      window.clearTimeout(resume.current);
      resume.current = window.setTimeout(() => setQuiet(false), RESUME_MS);
    };

    api.on("pointerDown", hush);
    api.on("pointerUp", release);

    return () => {
      window.clearTimeout(resume.current);
      api.off("pointerDown", hush);
      api.off("pointerUp", release);
    };
  }, [api]);

  useEffect(() => {
    if (!api || quiet) return;

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      /* `scrollNext` stops at the end without `loop`, so wrap by hand. */
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [api, quiet]);
}
