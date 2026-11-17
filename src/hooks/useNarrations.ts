import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AnnotationStatus } from "@/data/annotators/sessions";
import { useApiResource } from "@/hooks/useApiResource";
import { STATUS_MAP } from "@/hooks/useAnnotatorSessions";
import { claimNextNarration, listMine, listNarrationQueue } from "@/lib/api/annotations";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";
import { lengthOf } from "@/lib/duration";
import { NO_VALUE } from "@/lib/no-value";

/** One of this annotator's narrations. */
export type NarrationRow = { id: string; stimulus: string; durationSec: number; status: AnnotationStatus };

/**
 * The narrations side of the Sessions page: the pool (taken one at a time,
 * oldest first) and this annotator's own. Open count and limit come from the
 * dashboard the page already reads.
 */
export function useNarrations() {
  const navigate = useNavigate();
  const [isTaking, setTaking] = useState(false);
  const { data, isLoading, error, reload } = useApiResource(
    () => Promise.all([listNarrationQueue({ limit: 200 }), listMine({ kind: "narration", limit: 200 })]),
    []
  );

  const pool = data?.[0].items ?? [];
  const poolSeconds = pool.map((row) => Math.round(lengthOf(row) ?? 0));
  const rows: NarrationRow[] = (data?.[1] ?? []).map((entry) => ({
    id: entry.id,
    stimulus: entry.topic ?? NO_VALUE,
    durationSec: Math.round(lengthOf(entry) ?? 0),
    status: STATUS_MAP[entry.status],
  }));

  /* 404 when the pool is empty and 409 at the limit both carry a sentence
     meant to be shown as it is. */
  const take = async () => {
    setTaking(true);
    try {
      const document = await claimNextNarration();
      navigate(`/annotator/narrations/${document.id}`);
    } catch (cause) {
      const message = reportApiError(cause, "Could not take a narration.");
      if (message) alvaToast.error(message);
    } finally {
      setTaking(false);
    }
  };

  return {
    rows,
    waiting: data ? data[0].total : null,
    /** Pool lengths, for the page's cards. */
    poolSeconds,
    isLoading,
    error,
    reload,
    take,
    isTaking,
  };
}
