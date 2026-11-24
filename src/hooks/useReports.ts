import { useCallback, useEffect, useState } from "react";
import { decideReport, listReports, type ApiReportRow } from "@/lib/api/recordingFlags";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";

/** Open reports on contributors. Each one is a contributor whose uploads are paused. */
export function useReports() {
  const [reports, setReports] = useState<ApiReportRow[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isWorking, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listReports("open")
      .then((page) => {
        if (cancelled) return;
        setReports(page.items);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load the reports."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  /** True once decided; the report leaves the open list. */
  const decide = useCallback(async (id: string, decision: "dismiss" | "uphold") => {
    setWorking(true);
    setError(null);
    try {
      await decideReport(id, decision);
      setReports((rows) => rows.filter((row) => row.id !== id));
      return true;
    } catch (cause) {
      /* A toast: the dialog is in front of the table's error line. */
      const message = reportApiError(cause, "Could not decide that report.");
      if (message) alvaToast.error(message);
      return false;
    } finally {
      setWorking(false);
    }
  }, []);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return { reports, isLoading, isWorking, error, decide, reload };
}
