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
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminPageSkeleton } from "@/components/admin/shared/AdminPageSkeleton";
import { AdminStatusPill, type PillTone } from "@/components/admin/shared/AdminStatusPill";
import { CategoryBars } from "@/components/admin/shared/CategoryBars";
import { StatusRings } from "@/components/admin/shared/StatusRings";
import { ApprovalGauge } from "@/components/admin/shared/ApprovalGauge";
import {
  ADMIN_RECORDINGS,
  RECORDING_STATUS_LABELS,
  rejectionBreakdown,
  reviewerThroughput,
  type AdminRecording,
  type RecordingStatus,
} from "@/data/admin/oversight";
import { useDevRows, useSimulatedLoading } from "@/hooks/use-dev-ui-state";

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

/**
 * Every recording, and why they are being rejected.
 *
 * The rejection breakdown is the reason this page is not just a bigger review
 * queue: one reason dominating tells you whether the problem is guidance
 * ("does not match prompt") or equipment ("background noise"), and those have
 * completely different fixes.
 */
export default function AdminReviewsPage() {
  const isLoading = useSimulatedLoading();
  const [status, setStatus] = useState<StatusFilter>("all");
  const rows = useDevRows(ADMIN_RECORDINGS);

  const filtered = useMemo(
    () => (status === "all" ? rows : rows.filter((row) => row.status === status)),
    [rows, status]
  );

  const rejections = useMemo(() => rejectionBreakdown(rows), [rows]);
  const reviewers = useMemo(() => reviewerThroughput(rows), [rows]);

  const approved = rows.filter((row) => row.status === "approved").length;
  const rejected = rows.filter((row) => row.status === "rejected").length;
  const pending = rows.filter(
    (row) => row.status === "submitted" || row.status === "in_review"
  ).length;
  const decided = approved + rejected;

  const columns = [
    {
      key: "code",
      header: "Clip",
      sortValue: (row: AdminRecording) => row.code,
      render: (row: AdminRecording) => (
        <span className="font-medium tabular-nums text-foreground">{row.code}</span>
      ),
    },
    {
      key: "contributor",
      header: "Contributor",
      sortValue: (row: AdminRecording) => row.contributor,
      render: (row: AdminRecording) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.contributor}</span>
      ),
    },
    {
      key: "prompt",
      header: "Prompt",
      sortValue: (row: AdminRecording) => row.prompt,
      render: (row: AdminRecording) => (
        <TruncateCell className="max-w-sm text-muted-foreground" title={row.prompt}>
          {row.prompt}
        </TruncateCell>
      ),
    },
    {
      key: "mode",
      header: "Type",
      sortValue: (row: AdminRecording) => row.mode,
      render: (row: AdminRecording) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.mode}</span>
      ),
    },
    {
      key: "duration",
      header: "Length",
      sortValue: (row: AdminRecording) => row.durationSec,
      render: (row: AdminRecording) => (
        <span className="tabular-nums text-muted-foreground">{row.duration}</span>
      ),
    },
    {
      key: "reviewer",
      header: "Reviewer",
      sortValue: (row: AdminRecording) => row.reviewer,
      render: (row: AdminRecording) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {row.reviewer || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row: AdminRecording) => row.status,
      render: (row: AdminRecording) => (
        <AdminStatusPill tone={STATUS_TONE[row.status]}>
          {RECORDING_STATUS_LABELS[row.status]}
        </AdminStatusPill>
      ),
    },
    {
      key: "submittedLabel",
      header: "Submitted",
      sortValue: (row: AdminRecording) => row.submittedAt,
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

      {isLoading ? (
        <AdminPageSkeleton charts={3} chartColumns={3} table={true} />
      ) : (
        <>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          variant="accent"
          title="Recordings"
          value={String(rows.length)}
          trend={{ label: "", positive: false, neutral: true }}
          period=""
          icon={ClipboardCheck}
        />
        <MetricCard
          title="Approved"
          value={String(approved)}
          trend={{
            label: decided ? `${Math.round((approved / decided) * 100)}% of decided` : "",
            positive: false,
            neutral: true,
          }}
          period=""
          icon={CheckCircle}
        />
        <MetricCard
          title="Rejected"
          value={String(rejected)}
          trend={{ label: "", positive: false, neutral: true }}
          period=""
          icon={CloseCircle}
        />
        <MetricCard
          title="Awaiting a verdict"
          value={String(pending)}
          trend={{ label: "", positive: false, neutral: true }}
          period=""
          icon={ClockCircle}
        />
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-3">
        <AlvaChartCard
          title="Queue at a glance"
          subtitle="Each status as a share of everything submitted"
          className="min-h-[15rem]"
        >
          <StatusRings
            centerLabel="clips"
            slices={[
              {
                label: "Approved",
                value: approved,
                total: rows.length,
                color: "hsl(146 87% 54%)",
              },
              {
                label: "Awaiting",
                value: pending,
                total: rows.length,
                color: "hsl(38 92% 50%)",
              },
              {
                label: "Rejected",
                value: rejected,
                total: rows.length,
                color: "hsl(0 72% 51%)",
              },
            ]}
          />
        </AlvaChartCard>

        <AlvaChartCard
          title="Approval rate"
          subtitle="Share of decided clips kept"
          className="min-h-[15rem]"
        >
          <ApprovalGauge
            value={decided ? Math.round((approved / decided) * 100) : 0}
            label="approved"
          />
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
          <CategoryBars
            color="hsl(0 72% 51%)"
            data={rejections.map((entry) => ({
              name: entry.reason,
              value: entry.count,
            }))}
          />
        </AlvaChartCard>

      </div>

      <div className="mt-2">
        <AlvaChartCard title="Reviewer throughput" subtitle="Clips decided, and how strictly">
          <dl className="space-y-1">
            {reviewers.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Nobody has reviewed anything yet.
              </p>
            ) : (
              reviewers.map((reviewer) => (
                <div
                  key={reviewer.id}
                  className="flex items-baseline justify-between gap-3 border-b border-alva-border/50 py-2 last:border-0"
                >
                  <dt className="truncate text-xs text-foreground">{reviewer.name}</dt>
                  <dd className="flex shrink-0 items-baseline gap-3 text-xs tabular-nums">
                    <span className="text-muted-foreground">
                      {reviewer.reviewed} clips
                    </span>
                    <span className="text-muted-foreground">
                      {reviewer.approvalRate}% approved
                    </span>
                    <span className="w-14 text-right text-foreground">
                      {reviewer.medianMinutes}m
                    </span>
                  </dd>
                </div>
              ))
            )}
          </dl>
        </AlvaChartCard>
      </div>

      <div className="mt-2">
        <AlvaDataTable
          title="All recordings"
          rows={filtered}
          columns={columns}
          pageSize={10}
          searchPlaceholder="Search clip, contributor or prompt"
          searchKeys={["code", "contributor", "prompt"]}
          activeFilterCount={status === "all" ? 0 : 1}
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
                  onCheckedChange={() => setStatus(value)}
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
            description: "Clear the status filter to see the rest.",
          }}
        />
      </div>
        </>
      )}
    </DesktopPageShell>
  );
}
