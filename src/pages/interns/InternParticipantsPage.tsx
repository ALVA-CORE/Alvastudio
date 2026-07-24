import { useMemo, useState } from "react";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import MapPointWave from "@solar-icons/react/map/MapPointWave";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import GraphUp from "@solar-icons/react/business/GraphUp";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { AlvaDataTable } from "@/components/shared/AlvaDataTable";
import { ParticipantDetailSheet } from "@/components/interns/participants/ParticipantDetailSheet";
import {
  formatGenderLabel,
  PARTICIPANT_METRICS,
  type ParticipantRecord,
} from "@/data/interns/participants";
import { loadParticipants } from "@/lib/intern-participants";

export default function InternParticipantsPage() {
  const rows = useMemo(() => loadParticipants(), []);
  const [selected, setSelected] = useState<ParticipantRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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

      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          variant="accent"
          title="Total logged"
          value={PARTICIPANT_METRICS.total}
          trend={{
            label: PARTICIPANT_METRICS.totalTrend,
            positive: PARTICIPANT_METRICS.totalTrend.startsWith("+"),
          }}
          period={PARTICIPANT_METRICS.periodLabel}
          icon={UsersGroupRounded}
        />
        <MetricCard
          title="This week"
          value={PARTICIPANT_METRICS.thisWeek}
          trend={{
            label: PARTICIPANT_METRICS.thisWeekTrend,
            positive: true,
          }}
          period={PARTICIPANT_METRICS.periodLabel}
          icon={CheckCircle}
        />
        <MetricCard
          title="Sessions covered"
          value={PARTICIPANT_METRICS.sessions}
          trend={{
            label: PARTICIPANT_METRICS.sessionsTrend,
            positive: true,
          }}
          period={PARTICIPANT_METRICS.periodLabel}
          icon={MapPointWave}
        />
        <MetricCard
          title="Quota fill"
          value={PARTICIPANT_METRICS.quotaFill}
          trend={{
            label: PARTICIPANT_METRICS.quotaTrend,
            positive: true,
          }}
          period={PARTICIPANT_METRICS.periodLabel}
          icon={GraphUp}
        />
      </div>

      <div className="mt-2">
        <AlvaDataTable
          title="Logged participants"
          rows={tableRows}
          pageSize={8}
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
