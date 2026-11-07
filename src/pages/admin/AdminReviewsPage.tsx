import { useMemo, useState } from "react";
import ClipboardCheck from "@solar-icons/react/notes/ClipboardCheck";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import CloseCircle from "@solar-icons/react/ui/CloseCircle";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { AlvaChartCard } from "@/components/shared/AlvaChartCard";
import { AlvaDataTable, TruncateCell } from "@/components/shared/AlvaDataTable";
import { DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { AdminPageSkeleton } from "@/components/admin/shared/AdminPageSkeleton";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminStatusPill, type PillTone } from "@/components/admin/shared/AdminStatusPill";
import { ReviewerFlowChart } from "@/components/admin/shared/ReviewerFlowChart";
import { SharePie } from "@/components/admin/shared/SharePie";
import { RecordingDetailPanel } from "@/components/admin/reviews/RecordingDetailPanel";
import { ReassignReviewerDialog } from "@/components/admin/shared/ReassignReviewerDialog";
import { alvaToast } from "@/lib/alva-toast";
import { StatusRings } from "@/components/admin/shared/StatusRings";
import { ApprovalGauge } from "@/components/admin/shared/ApprovalGauge";
import {
  APPROVAL_EMPTY,
  APPROVAL_SUBTITLE,
  approvalRate,
} from "@/data/admin/approval";
import {
  RECORDING_STATUS_LABELS,
  REJECTION_REASON_LABEL,
  reviewerFlow,
  type AdminRecording,
  type RecordingStatus,
} from "@/data/admin/oversight";
import { useAdminReviews } from "@/hooks/useAdminReviews";
import type { ApiRecordingSort } from "@/lib/api/recordings";
import { reportApiError } from "@/lib/api/reportApiError";
import { NO_VALUE } from "@/lib/no-value";

type StatusFilter = RecordingStatus | "all";

const STATUS_TONE: Record<RecordingStatus, PillTone> = {
  approved: "good",
  in_review: "pending",
  submitted: "neutral",
  rejected: "bad",
  flagged: "pending",
};

const STATUSES: StatusFilter[] = [
  "all", "submitted", "in_review", "approved", "rejected", "flagged",
];

/* Reds and ambers — every slice here is a loss, so none of them should read
   as the accent, which on this surface means "kept". */
const REJECTION_PALETTE = [
  "hsl(0 72% 55%)",
  "hsl(14 80% 57%)",
  "hsl(28 85% 55%)",
  "hsl(38 92% 52%)",
  "hsl(350 60% 48%)",
];

/**
 * Every recording, and why they are being rejected.
 *
 * The rejection breakdown is the reason this page is not just a bigger review
 * queue: one reason dominating tells you whether the problem is guidance
 * ("does not match prompt") or equipment ("background noise"), and those have
 * completely different fixes.
 */
export default function AdminReviewsPage() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: ApiRecordingSort; order: "asc" | "desc" }>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detail, setDetail] = useState<AdminRecording | null>(null);
  const [reassigning, setReassigning] = useState<AdminRecording | null>(null);

  const { rows, total, summary, isLoading, isFetching, error, reload, reassign } =
    useAdminReviews({
      status: status === "all" ? undefined : status,
      q: query,
      sort,
      page,
      pageSize,
    });

  /* Any change of what is listed starts again from page one, in the same
     update, so the old page is never asked for under the new filter. */
  const showStatus = (next: StatusFilter) => {
    setStatus(next);
    setPage(1);
  };
  const search = (next: string) => {
    setQuery(next);
    setPage(1);
  };
  const sortBy = (key: string, order: "asc" | "desc") => {
    setSort({ key: key as ApiRecordingSort, order });
    setPage(1);
  };

  /* Every count is the server's, over all recordings, whatever the table
     shows. */
  const recordings = summary?.total ?? 0;
  const approved = summary?.by_status.approved ?? 0;
  const rejected = summary?.by_status.rejected ?? 0;
  const pending = (summary?.awaiting_in_bank ?? 0) + (summary?.awaiting_on_desks ?? 0);
  /* Through the shared function, so this and the dashboard cannot drift into
     two different answers under the same heading again. */
  const rate = approvalRate({ approved, rejected });

  const rejections = useMemo(
    () =>
      (summary?.rejection_reasons ?? [])
        .map((entry) => ({ reason: REJECTION_REASON_LABEL[entry.reason], count: entry.count }))
        .sort((a, b) => b.count - a.count),
    [summary]
  );

  const flow = useMemo(() => reviewerFlow(summary?.by_reviewer ?? []), [summary]);

  const columns = [
    {
      key: "code",
      header: "Clip",
      render: (row: AdminRecording) => (
        <span className="font-medium tabular-nums text-foreground">{row.code}</span>
      ),
    },
    {
      key: "contributor",
      header: "Contributor",
      serverSort: "contributor",
      render: (row: AdminRecording) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.contributor}</span>
      ),
    },
    {
      key: "prompt",
      header: "Prompt",
      serverSort: "text",
      render: (row: AdminRecording) => (
        <TruncateCell className="max-w-sm text-muted-foreground" title={row.prompt}>
          {row.prompt}
        </TruncateCell>
      ),
    },
    {
      key: "mode",
      header: "Type",
      serverSort: "session_type",
      render: (row: AdminRecording) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.mode}</span>
      ),
    },
    {
      key: "duration",
      header: "Length",
      serverSort: "duration",
      render: (row: AdminRecording) => (
        <span className="tabular-nums text-muted-foreground">{row.duration}</span>
      ),
    },
    {
      key: "reviewer",
      header: "Reviewer",
      serverSort: "reviewer",
      render: (row: AdminRecording) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {row.reviewer || NO_VALUE}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      serverSort: "status",
      render: (row: AdminRecording) => (
        <AdminStatusPill tone={STATUS_TONE[row.status]}>
          {RECORDING_STATUS_LABELS[row.status]}
        </AdminStatusPill>
      ),
    },
    {
      key: "submittedLabel",
      header: "Submitted",
      serverSort: "created_at",
      render: (row: AdminRecording) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {row.submittedLabel}
        </span>
      ),
    },
  ];

  return (
    <DesktopPageShell className="py-4">
      <AdminPageHeader id="reviews" />

      {error ? (
        <div
          role="alert"
          className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400"
        >
          {error}
          <button
            type="button"
            onClick={reload}
            className="shrink-0 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            Retry
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <AdminPageSkeleton charts={3} chartColumns={3} table={true} />
      ) : (
        <>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          variant="accent"
          title="Recordings"
          value={recordings.toLocaleString()}
          icon={ClipboardCheck}
        />
        <MetricCard
          title="Approved"
          value={approved.toLocaleString()}
          trend={{
            label: rate === null ? "" : `${rate}% of decided`,
            positive: false,
            neutral: true,
          }}
          icon={CheckCircle}
        />
        <MetricCard
          title="Rejected"
          value={rejected.toLocaleString()}
          icon={CloseCircle}
        />
        <MetricCard
          title="Awaiting a verdict"
          value={pending.toLocaleString()}
          icon={ClockCircle}
        />
      </div>

      {/* Three readings of the same queue, side by side: how it splits,
          how much of it survives, and why the rest does not. */}
      <div className="mt-2 grid gap-2 lg:grid-cols-3">
        <AlvaChartCard
          title="Queue at a glance"
          subtitle="Each status as a share of everything submitted"
          className="min-h-[16rem]"
        >
          <StatusRings
            centerLabel="clips"
            slices={[
              {
                label: "Approved",
                value: approved,
                total: recordings,
                color: "hsl(146 87% 54%)",
              },
              {
                label: "Awaiting",
                value: pending,
                total: recordings,
                color: "hsl(38 92% 50%)",
              },
              {
                label: "Rejected",
                value: rejected,
                total: recordings,
                color: "hsl(0 72% 51%)",
              },
            ]}
          />
        </AlvaChartCard>

        <AlvaChartCard
          title="Approval rate"
          subtitle={APPROVAL_SUBTITLE}
          className="min-h-[16rem]"
          emptyMessage={rate === null ? APPROVAL_EMPTY : undefined}
        >
          <ApprovalGauge value={rate ?? 0} label="approved" />
        </AlvaChartCard>

        <AlvaChartCard
          title="Why clips get rejected"
          subtitle="Guidance problem, or equipment problem"
          emptyMessage={
            rejections.every((entry) => entry.count === 0)
              ? { title: "Nothing rejected", description: "No pattern to read yet." }
              : undefined
          }
        >
          {/* Five causes of one total — the question is "which share of our
              rejections is this", and a donut answers that without the reader
              having to add the bars up. */}
          <SharePie
            centerLabel="rejected"
            palette={REJECTION_PALETTE}
            valueSuffix=""
            slices={rejections
              .filter((entry) => entry.count > 0)
              .map((entry) => ({ label: entry.reason, hours: entry.count }))}
          />
        </AlvaChartCard>
      </div>

      {/* Full width. A sankey needs the horizontal run, and in half a row
          the reviewer names on the left ran into the bands. */}
      <div className="mt-2">
        <AlvaChartCard
          title="Who is clearing the queue"
          subtitle="Clips each reviewer decided, and how they landed"
        >
          <ReviewerFlowChart
            flow={flow}
            emptyMessage="Nobody has reviewed anything yet."
          />
        </AlvaChartCard>
      </div>

      <div className="mt-2">
        <AlvaDataTable
          title="All recordings"
          rows={rows}
          columns={columns}
          pageSize={pageSize}
          isLoading={isFetching}
          serverPaging={{
            total,
            page,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
            onQueryChange: search,
            onSortChange: sortBy,
          }}
          searchPlaceholder="Search"
          activeFilterCount={status === "all" ? 0 : 1}
          onRowClick={(row: AdminRecording) => setDetail(row)}
          mobilePrimary={(row) => ({
            title: row.code,
            subtitle: `${row.contributor} · ${row.duration}`,
          })}
          filterMenuContent={
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Status
              </DropdownMenuLabel>
              {STATUSES.map((value) => (
                <DropdownMenuCheckboxItem
                  key={value}
                  checked={status === value}
                  onCheckedChange={() => showStatus(value)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {value === "all" ? "All statuses" : RECORDING_STATUS_LABELS[value]}
                </DropdownMenuCheckboxItem>
              ))}
            </>
          }
          emptyState={{
            icon: <ClipboardCheck size={20} weight="Outline" />,
            title: "No recordings match",
            description: "Clear the search or the status filter to see the rest.",
          }}
        />
      </div>

      <RecordingDetailPanel
        open={detail !== null}
        onOpenChange={(next) => !next && setDetail(null)}
        recording={detail}
        /* Reopening is `assignee: null` — the endpoint that returns a clip to
           the queue is the same one that moves it between reviewers, because
           "unassigned and waiting" is what the queue is. */
        onReopen={async (recording) => {
          try {
            await reassign(recording.id, null);
            setDetail(null);
            alvaToast.success(`${recording.code} back in the queue`);
          } catch (cause) {
            const message = reportApiError(cause, "Could not reopen that clip.");
            if (message) alvaToast.error(message);
          }
        }}
        onReassign={(row: AdminRecording) => setReassigning(row)}
      />

      <ReassignReviewerDialog
        open={reassigning !== null}
        onOpenChange={(next) => !next && setReassigning(null)}
        subject={reassigning ? `${reassigning.code} · ${reassigning.contributor}` : null}
        exclude={reassigning?.reviewer}
        onAssign={async (reviewer) => {
          if (!reassigning) return;
          try {
            await reassign(reassigning.id, reviewer.id);
            alvaToast.success(`Reassigned to ${reviewer.name}`);
          } catch (cause) {
            const message = reportApiError(cause, "Could not reassign that clip.");
            if (message) alvaToast.error(message);
          }
          setReassigning(null);
        }}
      />
        </>
      )}
    </DesktopPageShell>
  );
}
