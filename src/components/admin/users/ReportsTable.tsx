import { useEffect, useState } from "react";
import Flag from "@solar-icons/react/ui/Flag";
import { AlvaDataTable } from "@/components/shared/AlvaDataTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import { relativeDays } from "@/data/admin/shared";
import {
  clearRecordingFlag,
  getReport,
  reasonsText,
  type ApiReportDetail,
  type ApiReportRow,
} from "@/lib/api/recordingFlags";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";
import type { useReports } from "@/hooks/useReports";

/**
 * Contributors reported by hand, or by four junk flags. Their uploads are
 * paused until an admin decides: dismiss resumes them, uphold deactivates
 * the account. To remove someone for good, delete them with the block tick.
 */
export function ReportsTable({ reports, isLoading, isWorking, error, decide }: ReturnType<typeof useReports>) {
  const [open, setOpen] = useState<ApiReportRow | null>(null);

  const columns = [
    {
      key: "contributor_name",
      header: "Contributor",
      sortable: true,
      sortValue: (row: ApiReportRow) => row.contributor_name ?? row.contributor_email,
      render: (row: ApiReportRow) => (
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{row.contributor_name ?? row.contributor_email}</span>
          <span className="block truncate text-xs text-muted-foreground">{row.contributor_email}</span>
        </span>
      ),
    },
    {
      key: "source",
      header: "Opened by",
      render: (row: ApiReportRow) => (
        <span className="text-muted-foreground">{row.source === "automatic" ? "Flags" : "A report"}</span>
      ),
    },
    {
      key: "active_flags",
      header: "Flags",
      sortable: true,
      sortValue: (row: ApiReportRow) => row.active_flags,
      render: (row: ApiReportRow) => <span className="tabular-nums text-muted-foreground">{row.active_flags}</span>,
    },
    {
      key: "filings",
      header: "Reports",
      sortable: true,
      sortValue: (row: ApiReportRow) => row.filings,
      render: (row: ApiReportRow) => <span className="tabular-nums text-muted-foreground">{row.filings}</span>,
    },
    {
      key: "created_at",
      header: "Opened",
      sortable: true,
      sortValue: (row: ApiReportRow) => new Date(row.created_at).getTime(),
      render: (row: ApiReportRow) => (
        <span className="tabular-nums text-muted-foreground">{relativeDays(new Date(row.created_at))}</span>
      ),
    },
  ];

  return (
    <>
      {error ? (
        <p role="alert" className="mb-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400">
          {error}
        </p>
      ) : null}

      <AlvaDataTable<ApiReportRow>
        title="Reports"
        rows={reports}
        columns={columns}
        pageSize={10}
        isLoading={isLoading}
        searchPlaceholder="Search"
        onRowClick={setOpen}
        mobilePrimary={(row) => ({
          title: row.contributor_name ?? row.contributor_email,
          subtitle: `${row.active_flags} flags · ${row.filings} reports`,
        })}
        emptyState={{
          icon: <Flag size={18} weight="Outline" />,
          title: "No open reports",
          description: "Reported contributors show here, with their uploads paused.",
        }}
      />

      <ReportDialog
        report={open}
        onOpenChange={(next) => !next && setOpen(null)}
        isWorking={isWorking}
        onDecide={async (decision) => {
          if (!open) return;
          if (await decide(open.id, decision)) {
            alvaToast.success(decision === "dismiss" ? "Dismissed. Their uploads resume." : "Upheld. The account is deactivated.");
            setOpen(null);
          }
        }}
      />
    </>
  );
}

/** Who reported them, every flag on their clips, and their clip counts. */
function ReportDialog({
  report,
  onOpenChange,
  isWorking,
  onDecide,
}: {
  report: ApiReportRow | null;
  onOpenChange: (open: boolean) => void;
  isWorking: boolean;
  onDecide: (decision: "dismiss" | "uphold") => void;
}) {
  const [detail, setDetail] = useState<ApiReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [clearing, setClearing] = useState<string | null>(null);

  /* A flag made by mistake: the clip goes back to review, stops counting
     toward this report, and is paid again if it's approved. */
  const clear = async (recordingId: string) => {
    setClearing(recordingId);
    try {
      await clearRecordingFlag(recordingId);
      alvaToast.success("Flag cleared. The clip is back in review.");
      setAttempt((value) => value + 1);
    } catch (cause) {
      const message = reportApiError(cause, "Could not clear that flag.");
      if (message) alvaToast.error(message);
    } finally {
      setClearing(null);
    }
  };

  useEffect(() => setDetail(null), [report]);

  useEffect(() => {
    if (!report) return;
    let cancelled = false;
    setError(null);
    getReport(report.id)
      .then((row) => !cancelled && setDetail(row))
      .catch((cause: unknown) => !cancelled && setError(reportApiError(cause, "Could not load this report.")));
    return () => {
      cancelled = true;
    };
  }, [report, attempt]);

  return (
    <Dialog open={report !== null} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-h-[85vh] overflow-y-auto border-alva-border bg-alva-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg text-foreground">
            {report?.contributor_name ?? report?.contributor_email}
          </DialogTitle>
        </DialogHeader>

        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : !detail ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-4">
            <dl className="grid grid-cols-4 gap-2 rounded-2xl bg-alva-surface px-4 py-3 text-center">
              {(["uploaded", "approved", "rejected", "flagged"] as const).map((key) => (
                <div key={key}>
                  <dd className="text-sm font-medium tabular-nums text-foreground">{detail.clips[key]}</dd>
                  <dt className="text-xs capitalize text-muted-foreground">{key}</dt>
                </div>
              ))}
            </dl>

            {detail.filings_list.length ? (
              <section>
                <p className="text-xs text-muted-foreground">Reported by</p>
                <ul className="mt-1.5 space-y-2">
                  {detail.filings_list.map((filing) => (
                    <li key={filing.id} className="text-sm text-foreground">
                      {filing.reporter_name ?? "Someone"}
                      {filing.reporter_role ? ` (${filing.reporter_role})` : ""}: {reasonsText(filing.reasons)}
                      {filing.note ? <span className="block text-xs text-muted-foreground">{filing.note}</span> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {detail.flags.length ? (
              <section>
                <p className="text-xs text-muted-foreground">Flags on their clips</p>
                <ul className="mt-1.5 space-y-2">
                  {detail.flags.map((flag) => (
                    <li key={flag.id} className="flex items-start justify-between gap-3">
                      <span className={flag.cleared_at ? "text-sm text-muted-foreground line-through" : "text-sm text-foreground"}>
                        {reasonsText(flag.reasons)}
                        <span className="block text-xs text-muted-foreground no-underline">
                          {flag.flagged_by_name ?? "Someone"} · {relativeDays(new Date(flag.created_at))}
                          {flag.note ? ` · ${flag.note}` : ""}
                        </span>
                      </span>
                      {flag.cleared_at ? (
                        <span className="shrink-0 text-xs text-muted-foreground">Cleared</span>
                      ) : (
                        <TextureButton
                          variant="minimal"
                          size="sm"
                          className="w-auto shrink-0"
                          loading={clearing === flag.recording_id}
                          onClick={() => void clear(flag.recording_id)}
                        >
                          Clear
                        </TextureButton>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <TextureButton variant="minimal" size="sm" className="w-auto" disabled={isWorking} onClick={() => onDecide("dismiss")}>
                Dismiss, resume uploads
              </TextureButton>
              <TextureButton variant="destructive" size="sm" className="w-auto" loading={isWorking} onClick={() => onDecide("uphold")}>
                Uphold, deactivate
              </TextureButton>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
