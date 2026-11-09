import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Clipboard from "@solar-icons/react/notes/Clipboard";
import { TextureButton } from "@/components/ui/texture-button";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { REVIEW_STATUS_LABELS, type ReviewQueueItem } from "@/data/reviewQueue";
import { useReviewHistory, useReviewQueue } from "@/hooks/useReviewQueue";
import type { ApiRecordingSort } from "@/lib/api/recordings";
import { AlvaDataTable } from "@/components/shared/AlvaDataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getReviewDisplayStatus } from "@/lib/review-progress";
import { cn } from "@/lib/utils";


function StatusBadge({ status }: { status: keyof typeof REVIEW_STATUS_LABELS }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        status === "completed" && "bg-alva-accent/15 text-alva-accent",
        status === "in-progress" && "bg-amber-500/15 text-amber-300",
        status === "not-started" && "bg-alva-surface text-muted-foreground"
      )}
    >
      {REVIEW_STATUS_LABELS[status]}
    </span>
  );
}

export default function InternReviewPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"pending" | "completed">("pending");
  /* Their desk, and how many wait in the bank for one. */
  const { items, waiting, isLoading, error, reload, assignNext, isAssigning } =
    useReviewQueue();

  /* Their history, a page at a time, once the tab is opened. Search and sort
     go back to page one in the same update. */
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(8);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historySort, setHistorySort] = useState<{ key: ApiRecordingSort; order: "asc" | "desc" }>();
  const history = useReviewHistory({
    q: historyQuery,
    sort: historySort,
    page: historyPage,
    pageSize: historyPageSize,
    enabled: tab === "completed",
  });

  const pendingRows = useMemo(
    () =>
      items.filter((row) => {
        const displayStatus = getReviewDisplayStatus(row.id, row.status, Boolean(row.draft));
        return displayStatus !== "completed";
      }),
    [items]
  );

  const tableColumns = [
    {
      key: "contributor",
      header: "Contributor",
      sortValue: (row: ReviewQueueItem) => row.contributor,
      serverSort: "contributor",
      render: (row: ReviewQueueItem) => (
        <span className="font-medium text-foreground">{row.contributor}</span>
      ),
    },
    {
      key: "mode",
      header: "Mode",
      sortValue: (row: ReviewQueueItem) => row.mode,
      serverSort: "session_type",
      render: (row: ReviewQueueItem) => (
        <span className="text-muted-foreground">{row.mode}</span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      sortValue: (row: ReviewQueueItem) => row.durationSec,
      serverSort: "duration",
      render: (row: ReviewQueueItem) => (
        <span className="text-muted-foreground">{row.duration}</span>
      ),
    },
    {
      key: "language",
      header: "Language",
      sortValue: (row: ReviewQueueItem) => row.language,
      render: (row: ReviewQueueItem) => (
        <span className="text-muted-foreground">{row.language}</span>
      ),
    },
    {
      key: "submitted",
      header: "Submitted",
      sortValue: (row: ReviewQueueItem) => row.submittedAt,
      serverSort: "created_at",
      render: (row: ReviewQueueItem) => (
        <span className="text-muted-foreground">{row.submittedAt}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row: ReviewQueueItem) =>
        getReviewDisplayStatus(row.id, row.status, Boolean(row.draft)),
      render: (row: ReviewQueueItem) => (
        <StatusBadge
          status={getReviewDisplayStatus(row.id, row.status, Boolean(row.draft))}
        />
      ),
    },
  ];

  return (
    <DesktopPageShell className="py-4">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-foreground">Review</h1>
          </div>

          {/* The queue hands work out by claim: assign-next moves the next
              recording from submitted to in_review and locks it to you. */}
          <div className="flex items-center gap-3">
            {waiting ? (
              <span className="text-sm text-muted-foreground">
                <span className="tabular-nums text-foreground">{waiting.toLocaleString()}</span>{" "}
                {waiting === 1 ? "clip" : "clips"} waiting for a desk
              </span>
            ) : null}
            <TextureButton
              variant="alva"
              size="sm"
              className="w-auto shrink-0"
              onClick={async () => {
                /* `assignNext` reports its own failures and resolves null, so
                   there is nothing to catch — but it must stay that way, and a
                   rejection escaping here would be invisible. */
                const id = await assignNext().catch(() => null);
                if (id) navigate(`/intern/review/${id}`);
              }}
              loading={isAssigning}
            >
              Review next
            </TextureButton>
          </div>
        </div>

        {error || history.error ? (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400"
          >
            {error ?? history.error}
            <button
              type="button"
              onClick={reload}
              className="shrink-0 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
            >
              Retry
            </button>
          </div>
        ) : null}

        <Tabs value={tab} onValueChange={(value) => setTab(value as "pending" | "completed")}>
          <TabsList className="h-9 rounded-full bg-alva-surface p-1">
            <TabsTrigger
              value="pending"
              className="rounded-full px-4 text-sm data-[state=active]:bg-alva-card data-[state=active]:text-foreground"
            >
              <span className="flex items-center gap-2">
                Pending
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-alva-accent px-1.5 text-[10px] font-semibold text-alva-bg">
                  {pendingRows.length}
                </span>
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="rounded-full px-4 text-sm data-[state=active]:bg-alva-card data-[state=active]:text-foreground"
            >
              Completed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-2">
            <AlvaDataTable
              title="Pending clips"
              rows={pendingRows}
              pageSize={8}
              isLoading={isLoading}
              searchPlaceholder="Search"
              onRowClick={(row) => navigate(`/intern/review/${row.id}`)}
              mobilePrimary={(row) => ({
                title: row.contributor,
                subtitle: `${row.mode} · ${row.duration}`,
              })}
              emptyState={{
                icon: <Clipboard size={20} weight="Outline" />,
                title: "No pending clips",
                description: "You're all caught up on the contributor queue.",
              }}
              columns={tableColumns}
            />
          </TabsContent>

          <TabsContent value="completed" className="mt-2">
            <AlvaDataTable
              title="Completed reviews"
              rows={history.items}
              pageSize={historyPageSize}
              isLoading={history.isFetching}
              serverPaging={{
                total: history.total,
                page: historyPage,
                onPageChange: setHistoryPage,
                onPageSizeChange: setHistoryPageSize,
                onQueryChange: (next) => {
                  setHistoryQuery(next);
                  setHistoryPage(1);
                },
                onSortChange: (key, order) => {
                  setHistorySort({ key: key as ApiRecordingSort, order });
                  setHistoryPage(1);
                },
              }}
              searchPlaceholder="Search"
              onRowClick={(row) => navigate(`/intern/review/${row.id}`)}
              mobilePrimary={(row) => ({
                title: row.contributor,
                subtitle: `${row.mode} · Done`,
              })}
              emptyState={{
                icon: <Clipboard size={20} weight="Outline" />,
                title: "No completed reviews yet",
                description: "Finished reviews will show up here.",
              }}
              columns={tableColumns}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DesktopPageShell>
  );
}
