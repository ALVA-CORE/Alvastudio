import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import Clipboard from "@solar-icons/react/notes/Clipboard";
import { AnnotatorMobileGate } from "@/components/annotators/layout/AnnotatorMobileGate";
import { SessionStatusBadge } from "@/components/annotators/sessions/SessionStatusBadge";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { AlvaDataTable, TruncateCell } from "@/components/shared/AlvaDataTable";
import { MetricCard } from "@/components/shared/MetricCard";
import { AlvaMetricGridSkeleton } from "@/components/shared/states/AlvaMetricGridSkeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import {
  EMPTY_SESSION_METRICS,
  SESSION_METRICS,
  formatLanguageShort,
  getAnnotatorSessions,
  type AnnotatorSession,
} from "@/data/annotators/sessions";
import { useDevRows, useSimulatedLoading } from "@/hooks/use-dev-ui-state";
import { useIsMobile } from "@/hooks/use-mobile";

type LanguageFilter = AnnotatorSession["language"] | "all";

const LANGUAGE_FILTERS: { value: LanguageFilter; label: string }[] = [
  { value: "all", label: "All languages" },
  { value: "Nigerian Pidgin", label: "Pidgin" },
  { value: "Nigerian English", label: "English" },
  { value: "Mixed", label: "Mixed" },
];

export default function AnnotatorSessionsPage() {
  const isMobile = useIsMobile();
  const isLoading = useSimulatedLoading();
  const navigate = useNavigate();
  const sourceRows = useMemo(() => getAnnotatorSessions(), []);
  const rows = useDevRows(sourceRows);

  const [tab, setTab] = useState<"pending" | "completed">("pending");
  const [language, setLanguage] = useState<LanguageFilter>("all");

  if (isMobile) {
    return <AnnotatorMobileGate />;
  }

  const isEmpty = rows.length === 0;
  const metrics = isEmpty ? EMPTY_SESSION_METRICS : SESSION_METRICS;

  const languageFiltered =
    language === "all" ? rows : rows.filter((row) => row.language === language);

  const pendingRows = languageFiltered.filter((row) => row.status !== "completed");
  const completedRows = languageFiltered.filter((row) => row.status === "completed");

  // Rows open the annotation workspace directly. The metadata that used to live
  // in a slide-over sheet is now the workspace's right-hand sidebar, so there is
  // no intermediate step between picking a session and working it.
  const handleRowClick = (row: AnnotatorSession) => {
    navigate(`/annotator/sessions/${row.id}`);
  };

  const columns = [
    {
      key: "code",
      header: "Session",
      sortValue: (row: AnnotatorSession) => row.code,
      render: (row: AnnotatorSession) => (
        <span className="font-medium tabular-nums text-foreground">{row.code}</span>
      ),
    },
    {
      key: "topic",
      header: "Topic",
      sortValue: (row: AnnotatorSession) => row.topic,
      render: (row: AnnotatorSession) => (
        <TruncateCell className="text-muted-foreground" title={row.topic}>
          {row.topic}
        </TruncateCell>
      ),
    },
    {
      key: "state",
      header: "State",
      sortValue: (row: AnnotatorSession) => row.state,
      render: (row: AnnotatorSession) => (
        <span className="text-muted-foreground">{row.state}</span>
      ),
    },
    {
      key: "speakers",
      header: "Speakers",
      sortValue: (row: AnnotatorSession) => row.speakers,
      render: (row: AnnotatorSession) => (
        <span className="tabular-nums text-muted-foreground">{row.speakers}</span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      sortValue: (row: AnnotatorSession) => row.durationSec,
      render: (row: AnnotatorSession) => (
        <span className="tabular-nums text-muted-foreground">{row.duration}</span>
      ),
    },
    {
      key: "language",
      header: "Language",
      sortValue: (row: AnnotatorSession) => row.language,
      render: (row: AnnotatorSession) => (
        <span className="text-muted-foreground">{formatLanguageShort(row.language)}</span>
      ),
    },
    {
      key: "tagCount",
      header: "Tags",
      sortValue: (row: AnnotatorSession) => row.tagCount,
      render: (row: AnnotatorSession) => (
        <span className="tabular-nums text-muted-foreground">
          {row.tagCount === 0 ? "—" : row.tagCount}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row: AnnotatorSession) => row.status,
      render: (row: AnnotatorSession) => <SessionStatusBadge status={row.status} />,
    },
  ];

  const filterMenu = (
    <>
      <DropdownMenuLabel className="text-xs text-muted-foreground">
        Language
      </DropdownMenuLabel>
      {LANGUAGE_FILTERS.map((option) => (
        <DropdownMenuCheckboxItem
          key={option.value}
          checked={language === option.value}
          onCheckedChange={() => setLanguage(option.value)}
          onSelect={(event) => event.preventDefault()}
        >
          {option.label}
        </DropdownMenuCheckboxItem>
      ))}
    </>
  );

  const activeFilterCount = language === "all" ? 0 : 1;

  const sharedTableProps = {
    pageSize: 8,
    isLoading,
    searchPlaceholder: "Search session, topic, state",
    searchKeys: ["code", "topic", "state", "recordedBy"] as (keyof AnnotatorSession)[],
    onRowClick: handleRowClick,
    columns,
    filterMenuContent: filterMenu,
    activeFilterCount,
  };

  return (
    <DesktopPageShell className="py-4">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Sessions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Focus group recordings queued for annotation — multi-speaker
          conversational audio.
        </p>
      </header>

      {isLoading ? (
        <div className="mt-2">
          <AlvaMetricGridSkeleton />
        </div>
      ) : (
        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            variant="accent"
            title="Queued"
            value={metrics.queued}
            trend={{
              label: metrics.queuedTrend,
              positive: metrics.queuedTrend.startsWith("+"),
              neutral: isEmpty,
            }}
            period={metrics.periodLabel}
            icon={Clipboard}
          />
          <MetricCard
            title="Hours pending"
            value={metrics.hoursPending}
            trend={{
              label: metrics.hoursPendingTrend,
              positive: metrics.hoursPendingTrend.startsWith("+"),
              neutral: isEmpty,
            }}
            period={metrics.periodLabel}
            icon={ClockCircle}
          />
          <MetricCard
            title="Avg session"
            value={metrics.avgSession}
            trend={{
              label: metrics.avgSessionTrend,
              positive: metrics.avgSessionTrend.startsWith("-"),
              neutral: isEmpty,
            }}
            period={metrics.periodLabel}
            icon={Microphone3}
          />
          <MetricCard
            title="Speakers covered"
            value={metrics.speakersCovered}
            trend={{
              label: metrics.speakersTrend,
              positive: metrics.speakersTrend.startsWith("+"),
              neutral: isEmpty,
            }}
            period={metrics.periodLabel}
            icon={UsersGroupRounded}
          />
        </div>
      )}

      <Tabs
        className="mt-4"
        value={tab}
        onValueChange={(value) => setTab(value as "pending" | "completed")}
      >
        <TabsList className="h-9 rounded-full bg-alva-surface p-1">
          <TabsTrigger
            value="pending"
            className="rounded-full px-4 text-sm data-[state=active]:bg-alva-card data-[state=active]:text-foreground"
          >
            <span className="flex items-center gap-2">
              To annotate
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
            {...sharedTableProps}
            title="Sessions to annotate"
            rows={pendingRows}
            mobilePrimary={(row) => ({
              title: row.code,
              subtitle: `${row.state} · ${row.duration} · ${row.speakers} speakers`,
            })}
            emptyState={{
              icon: <UsersGroupRounded size={20} weight="Outline" />,
              title:
                activeFilterCount > 0
                  ? "No sessions match this filter"
                  : "No sessions to annotate",
              description:
                activeFilterCount > 0
                  ? "Clear the language filter to see the rest of the queue."
                  : "Focus group recordings appear here once interns submit a session.",
            }}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-2">
          <AlvaDataTable
            {...sharedTableProps}
            title="Completed sessions"
            rows={completedRows}
            mobilePrimary={(row) => ({
              title: row.code,
              subtitle: `${row.state} · ${row.tagCount} tags`,
            })}
            emptyState={{
              icon: <Clipboard size={20} weight="Outline" />,
              title: "No completed sessions yet",
              description: "Finished annotations will show up here.",
            }}
          />
        </TabsContent>
      </Tabs>
    </DesktopPageShell>
  );
}
