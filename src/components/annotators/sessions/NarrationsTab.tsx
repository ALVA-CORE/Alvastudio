import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatRoundDots from "@solar-icons/react/messages/ChatRoundDots";
import { SessionStatusBadge } from "@/components/annotators/sessions/SessionStatusBadge";
import { AlvaDataTable, TruncateCell, type AlvaTableColumn } from "@/components/shared/AlvaDataTable";
import { TextureButton } from "@/components/ui/texture-button";
import type { AnnotationStatus } from "@/data/annotators/sessions";
import { useApiResource } from "@/hooks/useApiResource";
import { STATUS_MAP } from "@/hooks/useAnnotatorSessions";
import { claimNextNarration, listMine, listNarrationQueue } from "@/lib/api/annotations";
import { annotatorDashboard } from "@/lib/api/dashboard";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";
import { formatDuration, lengthOf } from "@/lib/duration";
import { NO_VALUE } from "@/lib/no-value";
import { cn } from "@/lib/utils";

/** One of this annotator's narrations. */
type Row = { id: string; stimulus: string; durationSec: number; status: AnnotationStatus };

const columns: AlvaTableColumn<Row>[] = [
  {
    key: "stimulus",
    header: "Stimulus",
    sortValue: (row) => row.stimulus,
    render: (row) => (
      <TruncateCell className="max-w-xl text-foreground" title={row.stimulus}>
        {row.stimulus}
      </TruncateCell>
    ),
  },
  {
    key: "duration",
    header: "Length",
    sortValue: (row) => row.durationSec,
    render: (row) => (
      <span className="tabular-nums text-muted-foreground">
        {row.durationSec > 0 ? formatDuration(row.durationSec) : NO_VALUE}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    sortValue: (row) => row.status,
    render: (row) => <SessionStatusBadge status={row.status} />,
  },
];

/**
 * The Sessions page's Narrations tab: a contributor's Stimuli clip, at most
 * two minutes, one speaker. Taken from a pool one at a time, oldest first,
 * so the pool is a count rather than a list nobody can pick from.
 */
export function NarrationsTab() {
  const navigate = useNavigate();
  const [isTaking, setTaking] = useState(false);

  const { data, isLoading, error, reload } = useApiResource(
    () => Promise.all([listNarrationQueue({ limit: 1 }), listMine({ kind: "narration", limit: 200 })]),
    []
  );
  /* The open count and its limit exist only on the dashboard endpoint. */
  const { data: dashboard } = useApiResource(annotatorDashboard, []);
  const openClaims = dashboard?.open_narration_claims ?? 0;
  const claimLimit = dashboard?.narration_claim_limit ?? null;
  const waiting = data?.[0].total ?? null;

  const rows: Row[] = (data?.[1] ?? []).map((entry) => ({
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          {claimLimit != null ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium",
                openClaims >= claimLimit ? "bg-amber-500/15 text-amber-300" : "bg-alva-surface"
              )}
            >
              {openClaims} of {claimLimit} open
            </span>
          ) : null}
          {waiting != null ? <span className="tabular-nums">{waiting.toLocaleString()} waiting</span> : null}
        </span>
        <TextureButton
          variant="alva"
          size="sm"
          className="w-auto shrink-0"
          onClick={() => void take()}
          loading={isTaking}
        >
          Take next
        </TextureButton>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400"
        >
          {error}
          <button
            type="button"
            onClick={reload}
            className="shrink-0 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Retry
          </button>
        </div>
      ) : null}

      <AlvaDataTable
        title="Narrations"
        rows={rows}
        columns={columns}
        pageSize={8}
        isLoading={isLoading}
        searchPlaceholder="Search"
        onRowClick={(row) => navigate(`/annotator/narrations/${row.id}`)}
        mobilePrimary={(row) => ({
          title: row.stimulus,
          subtitle: row.durationSec > 0 ? formatDuration(row.durationSec) : NO_VALUE,
        })}
        emptyState={{
          icon: <ChatRoundDots size={20} weight="Outline" />,
          title: "No narrations yet",
        }}
      />
    </div>
  );
}
