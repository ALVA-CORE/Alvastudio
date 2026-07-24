import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Clipboard from "@solar-icons/react/notes/Clipboard";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { getAnnotatorReviewQueue, REVIEW_STATUS_LABELS } from "@/data/reviewQueue";
import { AlvaDataTable } from "@/components/shared/AlvaDataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getReviewDisplayStatus } from "@/lib/review-progress";
import { cn } from "@/lib/utils";

const ANNOTATOR_QUEUE = getAnnotatorReviewQueue();

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

export default function AnnotatorReviewPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"pending" | "completed">("pending");

  const pendingRows = useMemo(
    () =>
      ANNOTATOR_QUEUE.filter((row) => {
        const displayStatus = getReviewDisplayStatus(row.id, row.status, Boolean(row.draft));
        return displayStatus !== "completed";
      }),
    []
  );

  const completedRows = useMemo(
    () =>
      ANNOTATOR_QUEUE.filter((row) => {
        const displayStatus = getReviewDisplayStatus(row.id, row.status, Boolean(row.draft));
        return displayStatus === "completed";
      }),
    []
  );

  const tableColumns = [
    {
      key: "contributor",
      header: "Session",
      sortValue: (row: (typeof ANNOTATOR_QUEUE)[number]) => row.contributor,
      render: (row: (typeof ANNOTATOR_QUEUE)[number]) => (
        <span className="font-medium text-foreground">{row.contributor}</span>
      ),
    },
    {
      key: "mode",
      header: "Mode",
      sortValue: (row: (typeof ANNOTATOR_QUEUE)[number]) => row.mode,
      render: (row: (typeof ANNOTATOR_QUEUE)[number]) => (
        <span className="text-muted-foreground">{row.mode}</span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      sortValue: (row: (typeof ANNOTATOR_QUEUE)[number]) => row.durationSec,
      render: (row: (typeof ANNOTATOR_QUEUE)[number]) => (
        <span className="text-muted-foreground">{row.duration}</span>
      ),
    },
    {
      key: "language",
      header: "Language",
      sortValue: (row: (typeof ANNOTATOR_QUEUE)[number]) => row.language,
      render: (row: (typeof ANNOTATOR_QUEUE)[number]) => (
        <span className="text-muted-foreground">{row.language}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row: (typeof ANNOTATOR_QUEUE)[number]) =>
        getReviewDisplayStatus(row.id, row.status, Boolean(row.draft)),
      render: (row: (typeof ANNOTATOR_QUEUE)[number]) => (
        <StatusBadge
          status={getReviewDisplayStatus(row.id, row.status, Boolean(row.draft))}
        />
      ),
    },
  ];

  return (
    <DesktopPageShell className="py-4">
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl text-foreground">Focus group review</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Annotator queue for focus group session clips.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(value as "pending" | "completed")}>
          <TabsList className="h-9 rounded-full bg-alva-surface p-1">
            <TabsTrigger value="pending" className="rounded-full px-4 text-sm">
              Pending ({pendingRows.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-full px-4 text-sm">
              Completed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-2">
            <AlvaDataTable
              title="Pending focus group clips"
              rows={pendingRows}
              pageSize={8}
              searchPlaceholder="Search sessions, language"
              searchKeys={["contributor", "language"]}
              onRowClick={() => navigate("/annotator/dashboard")}
              columns={tableColumns}
              emptyState={{
                icon: <Clipboard size={20} weight="Outline" />,
                title: "No pending clips",
                description: "Focus group review detail is coming soon.",
              }}
            />
          </TabsContent>

          <TabsContent value="completed" className="mt-2">
            <AlvaDataTable
              title="Completed reviews"
              rows={completedRows}
              pageSize={8}
              searchPlaceholder="Search sessions, language"
              searchKeys={["contributor", "language"]}
              onRowClick={() => navigate("/annotator/dashboard")}
              columns={tableColumns}
              emptyState={{
                icon: <Clipboard size={20} weight="Outline" />,
                title: "No completed reviews yet",
                description: "Finished focus group reviews will show up here.",
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DesktopPageShell>
  );
}
