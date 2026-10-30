import { useEffect, useState } from "react";
import { getAnnotationSource } from "@/lib/api/annotations";

/**
 * The measured waveform for this annotation's audio.
 *
 * One array for the whole recording, 0..1 per bucket. The timeline slices
 * it per segment rather than each clip inventing its own shape.
 *
 * Null while loading, and null when the API has not measured the audio.
 * Both mean the same thing to the timeline — draw flat bars — so they are
 * not told apart here.
 */
export function useAnnotationWaveform(annotationId: string | undefined) {
  const [peaks, setPeaks] = useState<number[] | null>(null);

  useEffect(() => {
    if (!annotationId) {
      setPeaks(null);
      return;
    }

    let cancelled = false;

    getAnnotationSource(annotationId)
      .then((source) => {
        if (!cancelled) setPeaks(source.waveform_peaks ?? null);
      })
      .catch(() => {
        /* Flat bars. A workspace that will not open because a waveform
           could not be fetched would be the worse failure. */
        if (!cancelled) setPeaks(null);
      });

    return () => {
      cancelled = true;
    };
  }, [annotationId]);

  return peaks;
}
