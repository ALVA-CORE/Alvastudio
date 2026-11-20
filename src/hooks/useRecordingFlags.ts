import { useCallback, useEffect, useState } from "react";
import {
  dismissRecordingFlag,
  listRecordingFlags,
  type ApiRecordingFlag,
} from "@/lib/api/recordingFlags";
import { reportApiError } from "@/lib/api/reportApiError";

/** Open flags on recordings (ask #25), for the admin to dismiss or act on. */
export function useRecordingFlags() {
  const [flags, setFlags] = useState<ApiRecordingFlag[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isWorking, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    listRecordingFlags({ status: "open", limit: 200 })
      .then((page) => {
        if (cancelled) return;
        setFlags(page.items);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load the flags."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  /** True once dismissed. The contributor's count drops, so the list is read again. */
  const dismiss = useCallback(
    async (flagId: string) => {
      setWorking(true);
      setError(null);
      try {
        await dismissRecordingFlag(flagId);
        reload();
        return true;
      } catch (cause) {
        setError(reportApiError(cause, "Could not dismiss that flag."));
        return false;
      } finally {
        setWorking(false);
      }
    },
    [reload]
  );

  return { flags, isLoading, isWorking, error, dismiss };
}
