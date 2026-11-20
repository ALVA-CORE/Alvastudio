import { useEffect, useState } from "react";
import Flag from "@solar-icons/react/ui/Flag";
import { AlvaDataTable, TruncateCell } from "@/components/shared/AlvaDataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AdminStatusPill } from "@/components/admin/shared/AdminStatusPill";
import { ClipPlayer } from "@/components/admin/shared/ClipPlayer";
import { TextureButton } from "@/components/ui/texture-button";
import { relativeDays } from "@/data/admin/shared";
import { FLAG_REASON_LABEL, REPORT_AT, type ApiRecordingFlag } from "@/lib/api/recordingFlags";
import { recordingAudioUrl } from "@/lib/api/recordings";
import { alvaToast } from "@/lib/alva-toast";
import type { useRecordingFlags } from "@/hooks/useRecordingFlags";
import { NO_VALUE } from "@/lib/no-value";

type Row = ApiRecordingFlag & { reasonLabel: string };

/**
 * Recordings interns and admins flagged for cheating (ask #25). A flagged
 * clip is not paid; a contributor with three open flags is reported, and the
 * admin decides what happens to the account. Dismissing a wrong flag gives
 * the pay back.
 */
export function RecordingFlagsTable({
  flags,
  isLoading,
  isWorking,
  error,
  dismiss,
}: ReturnType<typeof useRecordingFlags>) {
  const [open, setOpen] = useState<Row | null>(null);

  const rows: Row[] = flags.map((flag) => ({
    ...flag,
    reasonLabel: FLAG_REASON_LABEL[flag.reason] ?? flag.reason.replace(/_/g, " "),
  }));

  const columns = [
    {
      key: "contributor_name",
      header: "Contributor",
      sortable: true,
      sortValue: (row: Row) => row.contributor_open_flags,
      render: (row: Row) => (
        <span className="flex items-center gap-2">
          <span className="font-medium text-foreground">{row.contributor_name}</span>
          {row.contributor_open_flags >= REPORT_AT ? (
            <AdminStatusPill tone="bad">Reported · {row.contributor_open_flags}</AdminStatusPill>
          ) : null}
        </span>
      ),
    },
    {
      key: "reasonLabel",
      header: "Reason",
      sortable: true,
      sortValue: (row: Row) => row.reasonLabel,
      render: (row: Row) => <span className="text-muted-foreground">{row.reasonLabel}</span>,
    },
    {
      key: "prompt_text",
      header: "Recording",
      render: (row: Row) => (
        <TruncateCell className="text-muted-foreground">{row.prompt_text ?? NO_VALUE}</TruncateCell>
      ),
    },
    {
      key: "flagged_by_name",
      header: "Flagged by",
      sortable: true,
      sortValue: (row: Row) => row.flagged_by_name,
      render: (row: Row) => <span className="text-muted-foreground">{row.flagged_by_name}</span>,
    },
    {
      key: "created_at",
      header: "Flagged",
      sortable: true,
      sortValue: (row: Row) => new Date(row.created_at).getTime(),
      render: (row: Row) => (
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

      <AlvaDataTable<Row>
        title="Flagged recordings"
        rows={rows}
        columns={columns}
        pageSize={10}
        isLoading={isLoading}
        searchPlaceholder="Search"
        onRowClick={setOpen}
        mobilePrimary={(row) => ({ title: row.contributor_name, subtitle: row.reasonLabel })}
        renderRowActions={(row) => (
          <div className="flex justify-end">
            <TextureButton
              variant="minimal"
              size="sm"
              className="w-auto"
              onClick={(event) => {
                event.stopPropagation();
                setOpen(row);
              }}
            >
              Review
            </TextureButton>
          </div>
        )}
        emptyState={{
          icon: <Flag size={18} weight="Outline" />,
          title: "No flagged recordings",
          description: "Recordings flagged for cheating show here.",
        }}
      />

      <ConfirmDialog
        open={open !== null}
        onOpenChange={(next) => !next && setOpen(null)}
        tone="default"
        title="Dismiss this flag?"
        description="The recording is paid again if it was approved, and the contributor's flag count drops."
        confirmLabel="Dismiss flag"
        cancelLabel="Keep flag"
        isPending={isWorking}
        detail={open ? <FlagDetail flag={open} /> : null}
        onConfirm={async () => {
          if (!open) return;
          if (await dismiss(open.id)) {
            alvaToast.success("Flag dismissed");
            setOpen(null);
          }
        }}
      />
    </>
  );
}

/** The clip and why it was flagged, so the admin listens before deciding. */
function FlagDetail({ flag }: { flag: Row }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    recordingAudioUrl(flag.recording_id)
      .then((link) => !cancelled && setSrc(link))
      .catch(() => !cancelled && setSrc(null));
    return () => {
      cancelled = true;
    };
  }, [flag.recording_id]);

  return (
    <div className="space-y-2 text-left">
      {src ? <ClipPlayer src={src} /> : null}
      <p className="text-xs text-muted-foreground">
        {flag.contributor_name} · {flag.reasonLabel} · by {flag.flagged_by_name}
      </p>
      {flag.note ? <p className="text-xs leading-relaxed text-foreground">{flag.note}</p> : null}
    </div>
  );
}
