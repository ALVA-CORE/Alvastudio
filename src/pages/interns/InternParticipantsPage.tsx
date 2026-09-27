import { useMemo, useState } from "react";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import MapPointWave from "@solar-icons/react/map/MapPointWave";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import GraphUp from "@solar-icons/react/business/GraphUp";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { AlvaDataTable } from "@/components/shared/AlvaDataTable";
import { AlvaMetricGridSkeleton } from "@/components/shared/states/AlvaMetricGridSkeleton";
import { ParticipantDetailSheet } from "@/components/interns/participants/ParticipantDetailSheet";
import {
  EMPTY_PARTICIPANT_METRICS,
  formatGenderLabel,
  type ParticipantRecord,
} from "@/data/interns/participants";
import { useDevRows } from "@/hooks/use-dev-ui-state";
import { useInternParticipants } from "@/hooks/useFocusGroups";

export default function InternParticipantsPage() {
  const { rows: sourceRows, sessions, isLoading, error, reload } =
    useInternParticipants();
  const rows = useDevRows(sourceRows);
  const [selected, setSelected] = useState<ParticipantRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isEmpty = rows.length === 0;

  /* Counted from the rows themselves. There is no participants dashboard
   * endpoint, so anything the API cannot supply is left blank rather than
   * invented — the quota target in particular is not something the backend
   * knows. See docs/backend-gaps.md. */
  const metrics = useMemo(() => {
    if (isEmpty) return EMPTY_PARTICIPANT_METRICS;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      ...EMPTY_PARTICIPANT_METRICS,
      total: String(rows.length),
      thisWeek: String(rows.filter((row) => row.loggedAt >= weekAgo).length),
      sessions: String(sessions.length),
      quotaFill: "—",
    };
  }, [isEmpty, rows, sessions.length]);

  const tableRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        genderLabel: formatGenderLabel(row.gender),
        loggedLabel: new Date(row.loggedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      })),
    [rows]
  );

  const handleRowClick = (row: (typeof tableRows)[number]) => {
    setSelected(row);
    setSheetOpen(true);
  };

  return (
    <DesktopPageShell className="py-4">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Participants</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Session participants logged before focus group recording.
        </p>
      </header>

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
        <div className="mt-2">
          <AlvaMetricGridSkeleton />
        </div>
      ) : (
        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            variant="accent"
            title="Total logged"
            value={metrics.total}
            trend={{
              label: metrics.totalTrend,
              positive: metrics.totalTrend.startsWith("+"),
              neutral: isEmpty,
            }}
            period={metrics.periodLabel}
            icon={UsersGroupRounded}
          />
          <MetricCard
            title="This week"
            value={metrics.thisWeek}
            trend={{
              label: metrics.thisWeekTrend,
              positive: true,
              neutral: isEmpty,
            }}
            period={metrics.periodLabel}
            icon={CheckCircle}
          />
          <MetricCard
            title="Sessions covered"
            value={metrics.sessions}
            trend={{
              label: metrics.sessionsTrend,
              positive: true,
              neutral: isEmpty,
            }}
            period={metrics.periodLabel}
            icon={MapPointWave}
          />
          <MetricCard
            title="Quota fill"
            value={metrics.quotaFill}
            trend={{
              label: metrics.quotaTrend,
              positive: true,
              neutral: isEmpty,
            }}
            period={metrics.periodLabel}
            icon={GraphUp}
          />
        </div>
      )}

      <div className="mt-2">
        <AlvaDataTable
          title="Logged participants"
          rows={tableRows}
          pageSize={8}
          isLoading={isLoading}
          searchPlaceholder="Search name, state, focus group"
          searchKeys={["nameOrId", "state", "focusGroupSession"]}
          onRowClick={handleRowClick}
          mobilePrimary={(row) => ({
            title: row.nameOrId,
            subtitle: `${row.state} · ${row.ageBracket}`,
          })}
          emptyState={{
            icon: <UsersGroupRounded size={20} weight="Outline" />,
            title: "No participants yet",
            description: "Log participants from the Record page before a session.",
          }}
          columns={[
            {
              key: "nameOrId",
              header: "Name / ID",
              sortValue: (row) => row.nameOrId,
              render: (row) => (
                <span className="font-medium text-foreground">{row.nameOrId}</span>
              ),
            },
            {
              key: "state",
              header: "State",
              sortValue: (row) => row.state,
              render: (row) => <span className="text-muted-foreground">{row.state}</span>,
            },
            {
              key: "ageBracket",
              header: "Age",
              sortValue: (row) => row.ageBracket,
              render: (row) => <span className="text-muted-foreground">{row.ageBracket}</span>,
            },
            {
              key: "genderLabel",
              header: "Gender",
              sortValue: (row) => row.genderLabel,
              render: (row) => <span className="text-muted-foreground">{row.genderLabel}</span>,
            },
            {
              key: "loggedLabel",
              header: "Logged",
              sortValue: (row) => row.loggedAt,
              render: (row) => <span className="text-muted-foreground">{row.loggedLabel}</span>,
            },
          ]}
        />
      </div>

      <ParticipantDetailSheet
        participant={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </DesktopPageShell>
  );
}
