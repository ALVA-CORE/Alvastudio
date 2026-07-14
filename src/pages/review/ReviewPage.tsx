import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Clipboard from "@solar-icons/react/notes/Clipboard";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { REVIEW_QUEUE, REVIEW_STATUS_LABELS } from "@/data/reviewQueue";
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

export default function ReviewPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"pending" | "completed">("pending");

  const pendingRows = useMemo(
    () =>
      REVIEW_QUEUE.filter((row) => {
        const displayStatus = getReviewDisplayStatus(row.id, row.status, Boolean(row.draft));
        return displayStatus !== "completed";
      }),
    []
  );

  const completedRows = useMemo(
    () =>
      REVIEW_QUEUE.filter((row) => {
        const displayStatus = getReviewDisplayStatus(row.id, row.status, Boolean(row.draft));
        return displayStatus === "completed";
      }),
    []
  );

  const tableColumns = [
    {
      key: "contributor",
      header: "Contributor",
      sortValue: (row: (typeof REVIEW_QUEUE)[number]) => row.contributor,
      render: (row: (typeof REVIEW_QUEUE)[number]) => (
        <span className="font-medium text-foreground">{row.contributor}</span>
      ),
    },
    {
      key: "mode",
      header: "Mode",
      sortValue: (row: (typeof REVIEW_QUEUE)[number]) => row.mode,
      render: (row: (typeof REVIEW_QUEUE)[number]) => (
        <span className="text-muted-foreground">{row.mode}</span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      sortValue: (row: (typeof REVIEW_QUEUE)[number]) => row.durationSec,
      render: (row: (typeof REVIEW_QUEUE)[number]) => (
        <span className="text-muted-foreground">{row.duration}</span>
      ),
    },
    {
      key: "language",
      header: "Language",
      sortValue: (row: (typeof REVIEW_QUEUE)[number]) => row.language,
      render: (row: (typeof REVIEW_QUEUE)[number]) => (
        <span className="text-muted-foreground">{row.language}</span>
      ),
    },
    {
      key: "submitted",
      header: "Submitted",
      sortValue: (row: (typeof REVIEW_QUEUE)[number]) => row.submittedAt,
      render: (row: (typeof REVIEW_QUEUE)[number]) => (
        <span className="text-muted-foreground">{row.submittedAt}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row: (typeof REVIEW_QUEUE)[number]) =>
        getReviewDisplayStatus(row.id, row.status, Boolean(row.draft)),
      render: (row: (typeof REVIEW_QUEUE)[number]) => (
        <StatusBadge
          status={getReviewDisplayStatus(row.id, row.status, Boolean(row.draft))}
        />
      ),
    },
  ];

  return (
    <DesktopPageShell className="py-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="font-display text-2xl text-foreground">Review</h1>
          </div>
        </div>

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
              searchPlaceholder="Search contributors, mode, language"
              searchKeys={["contributor", "mode", "language"]}
              onRowClick={(row) => navigate(`/review/${row.id}`)}
              mobilePrimary={(row) => ({
                title: row.contributor,
                subtitle: `${row.mode} · ${row.duration} · ${REVIEW_STATUS_LABELS[getReviewDisplayStatus(row.id, row.status, Boolean(row.draft))]}`,
              })}
              emptyState={{
                icon: <Clipboard size={20} weight="Outline" />,
                title: "No pending clips",
                description: "You're all caught up on the queue.",
              }}
              columns={tableColumns}
            />
          </TabsContent>

          <TabsContent value="completed" className="mt-2">
            <AlvaDataTable
              title="Completed reviews"
              rows={completedRows}
              pageSize={8}
              searchPlaceholder="Search contributors, mode, language"
              searchKeys={["contributor", "mode", "language"]}
              onRowClick={(row) => navigate(`/review/${row.id}`)}
              mobilePrimary={(row) => ({
                title: row.contributor,
                subtitle: `${row.mode} · ${row.duration} · Done`,
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
