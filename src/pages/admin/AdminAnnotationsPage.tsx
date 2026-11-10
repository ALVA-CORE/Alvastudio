import { useMemo, useState } from "react";
import DocumentText from "@solar-icons/react/notes/DocumentText";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import DangerTriangle from "@solar-icons/react/ui/DangerTriangle";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { AlvaChartCard } from "@/components/shared/AlvaChartCard";
import { AlvaDataTable, TruncateCell } from "@/components/shared/AlvaDataTable";
import { AnnotatorBreakdownChart } from "@/components/admin/shared/AnnotatorBreakdownChart";
import { DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { AdminPageSkeleton } from "@/components/admin/shared/AdminPageSkeleton";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminStatusPill, type PillTone } from "@/components/admin/shared/AdminStatusPill";
import { AssignAnnotatorDialog } from "@/components/admin/shared/AssignAnnotatorDialog";
import { AnnotationDetailPanel } from "@/components/admin/annotations/AnnotationDetailPanel";
import { alvaToast } from "@/lib/alva-toast";
import {
  ANNOTATION_STATUS_LABELS,
  annotatorBreakdown,
  type AdminAnnotation,
  type AnnotationStatus,
} from "@/data/admin/oversight";
import { useAdminAnnotations } from "@/hooks/useAdminAnnotations";
import type { ApiAnnotationSort } from "@/lib/api/annotations";
import { formatDuration, relativeDays } from "@/data/admin/shared";
import { reportApiError } from "@/lib/api/reportApiError";
import { NO_VALUE } from "@/lib/no-value";

type StatusFilter = AnnotationStatus | "all";

const STATUS_TONE: Record<AnnotationStatus, PillTone> = {
  approved: "good",
  submitted: "pending",
  draft: "neutral",
  needs_rework: "bad",
  rejected: "bad",
};

const STATUSES: StatusFilter[] = [
  "all", "draft", "submitted", "approved", "needs_rework", "rejected",
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
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: ApiAnnotationSort; order: "asc" | "desc" }>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const {
    rows,
    total,
    summary,
    queue: unclaimed,
    isLoading,
    isFetching,
    error,
    reload,
    assign,
    assignSession,
    setVerdict,
  } = useAdminAnnotations({
    status: status === "all" ? undefined : status,
    q: query,
    sort,
    page,
    pageSize,
  });
  /**
   * The thing being handed out, and which endpoint hands it out.
   *
   * `session` is work nobody has picked up, so there is no annotation yet and
   * the session itself is assigned. `annotation` is one that exists and is
   * changing hands. They take different ids on different routes, so the kind
   * travels with the id rather than being inferred at the call.
   */
  const [assigning, setAssigning] = useState<
    { kind: "session" | "annotation"; id: string; topic: string } | null
  >(null);
  const [detail, setDetail] = useState<AdminAnnotation | null>(null);

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
    setSort({ key: key as ApiAnnotationSort, order });
    setPage(1);
  };

  const breakdown = useMemo(() => annotatorBreakdown(summary?.by_annotator ?? []), [summary]);

  /* Every count is the server's, over all annotations, whatever the table
     shows. "In progress" is drafts: the API has no other in-progress status. */
  const approved = summary?.by_status.approved ?? 0;
  const inFlight = summary?.by_status.draft ?? 0;
  const rework = summary?.by_status.needs_rework ?? 0;
  const claimable = summary?.claimable_sessions ?? 0;

  const columns = [
    {
      key: "code",
      header: "Annotation",
      render: (row: AdminAnnotation) => (
        <span className="font-medium tabular-nums text-foreground">{row.code}</span>
      ),
    },
    {
      key: "topic",
      header: "Topic",
      serverSort: "topic",
      render: (row: AdminAnnotation) => (
        <TruncateCell className="max-w-sm text-muted-foreground" title={row.topic}>
          {row.topic}
        </TruncateCell>
      ),
    },
    {
      key: "annotator",
      header: "Annotator",
      serverSort: "annotator",
      render: (row: AdminAnnotation) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.annotator}</span>
      ),
    },
    {
      key: "segments",
      header: "Segments",
      serverSort: "segment_count",
      render: (row: AdminAnnotation) => (
        <span className="tabular-nums text-muted-foreground">{row.segments}</span>
      ),
    },
    {
      key: "tags",
      header: "Tags",
      render: (row: AdminAnnotation) => (
        <span className="tabular-nums text-muted-foreground">{row.tags}</span>
      ),
    },
    {
      key: "duration",
      header: "Length",
      serverSort: "duration",
      render: (row: AdminAnnotation) => (
        <span className="tabular-nums text-muted-foreground">{row.duration}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      serverSort: "status",
      render: (row: AdminAnnotation) => (
        <AdminStatusPill tone={STATUS_TONE[row.status]}>
          {ANNOTATION_STATUS_LABELS[row.status]}
        </AdminStatusPill>
      ),
    },
    {
      key: "claimedLabel",
      header: "Claimed",
      serverSort: "created_at",
      render: (row: AdminAnnotation) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.claimedLabel}</span>
      ),
    },
  ];

  return (
    <DesktopPageShell className="py-4">
      <AdminPageHeader id="annotations" />

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
        <AdminPageSkeleton charts={2} chartColumns={2} table={true} />
      ) : (
        <>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          variant="accent"
          title="Annotations"
          value={String(summary?.total ?? 0)}
          icon={DocumentText}
        />
        <MetricCard
          title="Approved"
          value={String(approved)}
          icon={CheckCircle}
        />
        <MetricCard
          title="In progress"
          value={String(inFlight)}
          icon={ClockCircle}
        />
        <MetricCard
          title="Unclaimed sessions"
          value={String(claimable)}
          trend={{
            label: rework > 0 ? `${rework} need rework` : "",
            positive: false,
            neutral: true,
          }}
          icon={DangerTriangle}
        />
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <AlvaChartCard
          title="Annotator throughput"
          subtitle="Sessions each annotator claimed, and where they stand"
        >
          <AnnotatorBreakdownChart
            data={breakdown}
            emptyMessage="Nobody has annotated anything yet."
          />
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
                key={session.session_id}
                className="flex items-center justify-between gap-3 border-b border-alva-border/50 py-1.5 last:border-0"
              >
                <dt className="min-w-0 truncate text-xs text-foreground" title={session.topic}>
                  {session.topic}
                </dt>
                <dd className="flex shrink-0 items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {session.duration_seconds
                      ? formatDuration(Math.round(session.duration_seconds))
                      : NO_VALUE}{" "}
                    · {relativeDays(new Date(session.created_at))}
                  </span>
                  {/* `PATCH /focus-groups/{id}/assignee` opens the annotation
                      as a side effect, so a session can be handed out before
                      anybody has claimed it. */}
                  <button
                    type="button"
                    onClick={() =>
                      setAssigning({
                        kind: "session",
                        id: session.session_id,
                        topic: session.topic,
                      })
                    }
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
                  onCheckedChange={() => showStatus(value)}
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
        onApprove={async (annotation) => {
          try {
            await setVerdict(annotation.id, "approved");
            setDetail(null);
            alvaToast.success(`${annotation.code} approved`);
          } catch (cause) {
            const message = reportApiError(cause, "Could not approve that one.");
            if (message) alvaToast.error(message);
          }
        }}
        onSendBack={async (annotation) => {
          try {
            await setVerdict(annotation.id, "needs_rework");
            setDetail(null);
            alvaToast.show(`${annotation.code} sent back`, { variant: "default" });
          } catch (cause) {
            const message = reportApiError(cause, "Could not send that one back.");
            if (message) alvaToast.error(message);
          }
        }}
        onReassign={(annotation) =>
          setAssigning({
            kind: "annotation",
            id: annotation.id,
            topic: annotation.topic,
          })
        }
      />

      <AssignAnnotatorDialog
        open={assigning !== null}
        onOpenChange={(next) => !next && setAssigning(null)}
        subject={assigning?.topic ?? null}
        onAssign={async (annotator) => {
          if (!assigning) return;
          try {
            if (assigning.kind === "session") {
              await assignSession(assigning.id, annotator.id);
            } else {
              await assign(assigning.id, annotator.id);
            }
            alvaToast.success(`Assigned to ${annotator.name}`);
          } catch (cause) {
            const message = reportApiError(cause, "Could not assign that one.");
            if (message) alvaToast.error(message);
          }
          setAssigning(null);
        }}
      />
        </>
      )}
    </DesktopPageShell>
  );
}
