import { useMemo, useState } from "react";
import DocumentText from "@solar-icons/react/notes/DocumentText";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import DangerTriangle from "@solar-icons/react/ui/DangerTriangle";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { AlvaChartCard } from "@/components/shared/AlvaChartCard";
import { AlvaDataTable, TruncateCell } from "@/components/shared/AlvaDataTable";
import { DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminPageSkeleton } from "@/components/admin/shared/AdminPageSkeleton";
import { AdminStatusPill, type PillTone } from "@/components/admin/shared/AdminStatusPill";
import { AssignAnnotatorDialog } from "@/components/admin/shared/AssignAnnotatorDialog";
import { AnnotationDetailPanel } from "@/components/admin/annotations/AnnotationDetailPanel";
import { alvaToast } from "@/lib/alva-toast";
import {
  ADMIN_ANNOTATIONS,
  ANNOTATION_STATUS_LABELS,
  ADMIN_SESSIONS,
  annotatorThroughput,
  type AdminAnnotation,
  type AnnotationStatus,
} from "@/data/admin/oversight";
import { useDevRows, useSimulatedLoading } from "@/hooks/use-dev-ui-state";

type StatusFilter = AnnotationStatus | "all";

const STATUS_TONE: Record<AnnotationStatus, PillTone> = {
  approved: "good",
  submitted: "pending",
  in_progress: "pending",
  draft: "neutral",
  needs_rework: "bad",
  rejected: "bad",
};

const STATUSES: StatusFilter[] = [
  "all", "draft", "in_progress", "submitted", "approved", "needs_rework", "rejected",
];

/**
 * Every annotation, and how long work has sat unclaimed.
 *
 * "Unclaimed" is the number to watch. A session nobody has taken is finished
 * intern work that produces nothing, and it is invisible on every other screen
 * — the annotator's own queue only shows what they could pick up, never how
 * long it has been waiting.
 */
export default function AdminAnnotationsPage() {
  const isLoading = useSimulatedLoading();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [assigning, setAssigning] = useState<{ id: string; topic: string } | null>(null);
  /* Sessions handed out from here, so the list reflects the action taken. */
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const [annotations, setAnnotations] = useState<AdminAnnotation[]>(ADMIN_ANNOTATIONS);
  const [detail, setDetail] = useState<AdminAnnotation | null>(null);
  const rows = useDevRows(annotations);

  const filtered = useMemo(
    () => (status === "all" ? rows : rows.filter((row) => row.status === status)),
    [rows, status]
  );

  const annotators = useMemo(() => annotatorThroughput(rows), [rows]);

  /* Sessions with audio that nobody has claimed. Those without audio are the
   * focus-group page's problem, not this one's. */
  const unclaimed = useMemo(() => {
    const claimed = new Set(rows.map((row) => row.topic));
    return ADMIN_SESSIONS.filter(
      (session) =>
        session.hasAudio && !claimed.has(session.topic) && !assigned[session.id]
    );
  }, [rows, assigned]);

  const approved = rows.filter((row) => row.status === "approved").length;
  const inFlight = rows.filter(
    (row) => row.status === "in_progress" || row.status === "draft"
  ).length;
  const rework = rows.filter((row) => row.status === "needs_rework").length;

  const columns = [
    {
      key: "code",
      header: "Annotation",
      sortValue: (row: AdminAnnotation) => row.code,
      render: (row: AdminAnnotation) => (
        <span className="font-medium tabular-nums text-foreground">{row.code}</span>
      ),
    },
    {
      key: "topic",
      header: "Topic",
      sortValue: (row: AdminAnnotation) => row.topic,
      render: (row: AdminAnnotation) => (
        <TruncateCell className="max-w-sm text-muted-foreground" title={row.topic}>
          {row.topic}
        </TruncateCell>
      ),
    },
    {
      key: "annotator",
      header: "Annotator",
      sortValue: (row: AdminAnnotation) => row.annotator,
      render: (row: AdminAnnotation) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.annotator}</span>
      ),
    },
    {
      key: "segments",
      header: "Segments",
      sortValue: (row: AdminAnnotation) => row.segments,
      render: (row: AdminAnnotation) => (
        <span className="tabular-nums text-muted-foreground">{row.segments}</span>
      ),
    },
    {
      key: "tags",
      header: "Tags",
      sortValue: (row: AdminAnnotation) => row.tags,
      render: (row: AdminAnnotation) => (
        <span className="tabular-nums text-muted-foreground">{row.tags}</span>
      ),
    },
    {
      key: "duration",
      header: "Length",
      sortValue: (row: AdminAnnotation) => row.durationSec,
      render: (row: AdminAnnotation) => (
        <span className="tabular-nums text-muted-foreground">{row.duration}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row: AdminAnnotation) => row.status,
      render: (row: AdminAnnotation) => (
        <AdminStatusPill tone={STATUS_TONE[row.status]}>
          {ANNOTATION_STATUS_LABELS[row.status]}
        </AdminStatusPill>
      ),
    },
    {
      key: "claimedLabel",
      header: "Claimed",
      sortValue: (row: AdminAnnotation) => row.claimedAt,
      render: (row: AdminAnnotation) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.claimedLabel}</span>
      ),
    },
  ];

  return (
    <DesktopPageShell className="py-4">
      <AdminPageHeader id="annotations" />

      {isLoading ? (
        <AdminPageSkeleton charts={2} chartColumns={2} table={true} />
      ) : (
        <>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          variant="accent"
          title="Annotations"
          value={String(rows.length)}
          trend={{ label: "", positive: false, neutral: true }}
          period=""
          icon={DocumentText}
        />
        <MetricCard
          title="Approved"
          value={String(approved)}
          trend={{ label: "", positive: false, neutral: true }}
          period=""
          icon={CheckCircle}
        />
        <MetricCard
          title="In progress"
          value={String(inFlight)}
          trend={{ label: "", positive: false, neutral: true }}
          period=""
          icon={ClockCircle}
        />
        <MetricCard
          title="Unclaimed sessions"
          value={String(unclaimed.length)}
          trend={{
            label: rework > 0 ? `${rework} need rework` : "",
            positive: false,
            neutral: true,
          }}
          period=""
          icon={DangerTriangle}
        />
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <AlvaChartCard
          title="Annotator throughput"
          subtitle="Segments produced, and hours worked"
        >
          <dl className="alva-thin-scrollbar max-h-[13rem] space-y-1 overflow-y-auto pr-1">
            {annotators.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Nobody has annotated anything yet.
              </p>
            ) : (
              annotators.map((annotator) => (
                <div
                  key={annotator.id}
                  className="flex items-baseline justify-between gap-3 border-b border-alva-border/50 py-2 last:border-0"
                >
                  <dt className="truncate text-xs text-foreground">{annotator.name}</dt>
                  <dd className="flex shrink-0 items-baseline gap-3 text-xs tabular-nums">
                    <span className="text-muted-foreground">
                      {annotator.annotations} sessions
                    </span>
                    <span className="text-muted-foreground">
                      {annotator.segments} segments
                    </span>
                    <span className="w-14 text-right text-foreground">
                      {annotator.hours}h
                    </span>
                  </dd>
                </div>
              ))
            )}
          </dl>
        </AlvaChartCard>

        <AlvaChartCard
          title="Waiting to be claimed"
          subtitle="Recorded, uploaded, and nobody has picked it up"
          emptyMessage={
            unclaimed.length === 0
              ? {
                  title: "Queue is clear",
                  description: "Every uploaded session has an annotator.",
                }
              : undefined
          }
        >
          {/* Each row is actionable. A list of things nobody has picked up, with
              no way to hand one to somebody, is just a complaint. */}
          <dl className="alva-thin-scrollbar max-h-[13rem] space-y-1 overflow-y-auto pr-1">
            {unclaimed.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-3 border-b border-alva-border/50 py-1.5 last:border-0"
              >
                <dt className="min-w-0 truncate text-xs text-foreground" title={session.topic}>
                  {session.topic}
                </dt>
                <dd className="flex shrink-0 items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {session.duration} · {session.createdLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAssigning({ id: session.id, topic: session.topic })}
                    className="rounded-full bg-alva-surface px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-alva-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
                  >
                    Assign
                  </button>
                </dd>
              </div>
            ))}
          </dl>
        </AlvaChartCard>
      </div>

      <div className="mt-2">
        <AlvaDataTable
          title="All annotations"
          rows={filtered}
          columns={columns}
          pageSize={10}
          searchPlaceholder="Search annotation, topic or annotator"
          searchKeys={["code", "topic", "annotator"]}
          activeFilterCount={status === "all" ? 0 : 1}
          onRowClick={(row: AdminAnnotation) => setDetail(row)}
          mobilePrimary={(row) => ({
            title: row.code,
            subtitle: `${row.annotator} · ${row.segments} segments`,
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
                  {value === "all" ? "All statuses" : ANNOTATION_STATUS_LABELS[value]}
                </DropdownMenuCheckboxItem>
              ))}
            </>
          }
          emptyState={{
            icon: <DocumentText size={20} weight="Outline" />,
            title: "No annotations match",
            description: "Clear the status filter to see the rest.",
          }}
        />
      </div>

      <AnnotationDetailPanel
        open={detail !== null}
        onOpenChange={(next) => !next && setDetail(null)}
        annotation={detail}
        onApprove={(annotation) => {
          setAnnotations((prev) =>
            prev.map((row) =>
              row.id === annotation.id ? { ...row, status: "approved" } : row
            )
          );
          setDetail(null);
          alvaToast.success(`${annotation.code} approved`);
        }}
        onSendBack={(annotation) => {
          setAnnotations((prev) =>
            prev.map((row) =>
              row.id === annotation.id ? { ...row, status: "needs_rework" } : row
            )
          );
          setDetail(null);
          alvaToast.show(`${annotation.code} sent back`, { variant: "default" });
        }}
        onReassign={(annotation) =>
          setAssigning({ id: annotation.id, topic: annotation.topic })
        }
      />

      <AssignAnnotatorDialog
        open={assigning !== null}
        onOpenChange={(next) => !next && setAssigning(null)}
        subject={assigning?.topic ?? null}
        onAssign={(annotator) => {
          if (!assigning) return;
          setAssigned((prev) => ({ ...prev, [assigning.id]: annotator }));
          setAnnotations((prev) =>
            prev.map((row) => (row.id === assigning.id ? { ...row, annotator } : row))
          );
          alvaToast.success(`Assigned to ${annotator}`);
          setAssigning(null);
        }}
      />
        </>
      )}
    </DesktopPageShell>
  );
}
