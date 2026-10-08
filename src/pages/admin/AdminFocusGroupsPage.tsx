import { useMemo, useState } from "react";
import UsersGroupTwoRounded from "@solar-icons/react/users/UsersGroupTwoRounded";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import DangerTriangle from "@solar-icons/react/ui/DangerTriangle";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { AlvaDataTable, TruncateCell } from "@/components/shared/AlvaDataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminPageSkeleton } from "@/components/admin/shared/AdminPageSkeleton";
import { AdminStatusPill } from "@/components/admin/shared/AdminStatusPill";
import { SessionDetailPanel } from "@/components/admin/sessions/SessionDetailPanel";
import { AssignAnnotatorDialog } from "@/components/admin/shared/AssignAnnotatorDialog";
import { alvaToast } from "@/lib/alva-toast";
import { ADMIN_SESSIONS, type AdminSession } from "@/data/admin/oversight";
import { STATES, round1 } from "@/data/admin/shared";
import { useDevRows, useSimulatedLoading } from "@/hooks/use-dev-ui-state";

type Tab = "all" | "no-audio";
type StateFilter = string | "all";

/**
 * Every focus group session, across every intern.
 *
 * Built around one fact: a session without audio never enters the annotation
 * queue. The intern has done the hard part — found people, got consent, run the
 * conversation — and it produces nothing. That tab exists to make sure it is
 * the first thing an admin sees, not something they have to sort for.
 */
export default function AdminFocusGroupsPage() {
  const isLoading = useSimulatedLoading();
  const [tab, setTab] = useState<Tab>("all");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [detail, setDetail] = useState<AdminSession | null>(null);
  const [assigning, setAssigning] = useState<AdminSession | null>(null);
  const rows = useDevRows(ADMIN_SESSIONS);

  const missingAudio = useMemo(() => rows.filter((row) => !row.hasAudio), [rows]);

  const filtered = useMemo(() => {
    const base = tab === "no-audio" ? missingAudio : rows;
    return stateFilter === "all"
      ? base
      : base.filter((row) => row.state === stateFilter);
  }, [rows, missingAudio, tab, stateFilter]);

  const totalHours = round1(
    rows.reduce((sum, row) => sum + row.durationSec, 0) / 3600
  );
  const participants = rows.reduce((sum, row) => sum + row.participants, 0);

  const columns = [
    {
      key: "code",
      header: "Session",
      sortValue: (row: AdminSession) => row.code,
      render: (row: AdminSession) => (
        <span className="font-medium tabular-nums text-foreground">{row.code}</span>
      ),
    },
    {
      key: "topic",
      header: "Topic",
      sortValue: (row: AdminSession) => row.topic,
      render: (row: AdminSession) => (
        <TruncateCell className="max-w-sm text-muted-foreground" title={row.topic}>
          {row.topic}
        </TruncateCell>
      ),
    },
    {
      key: "intern",
      header: "Intern",
      sortValue: (row: AdminSession) => row.intern,
      render: (row: AdminSession) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.intern}</span>
      ),
    },
    {
      key: "state",
      header: "State",
      sortValue: (row: AdminSession) => row.state,
      render: (row: AdminSession) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.state}</span>
      ),
    },
    {
      key: "participants",
      header: "Speakers",
      sortValue: (row: AdminSession) => row.participants,
      render: (row: AdminSession) => (
        <span className="tabular-nums text-muted-foreground">{row.participants}</span>
      ),
    },
    {
      key: "duration",
      header: "Length",
      sortValue: (row: AdminSession) => row.durationSec,
      render: (row: AdminSession) => (
        <span className="tabular-nums text-muted-foreground">{row.duration}</span>
      ),
    },
    {
      key: "hasAudio",
      header: "Audio",
      sortValue: (row: AdminSession) => String(row.hasAudio),
      render: (row: AdminSession) => (
        <AdminStatusPill tone={row.hasAudio ? "good" : "bad"}>
          {row.hasAudio ? "Uploaded" : "Missing"}
        </AdminStatusPill>
      ),
    },
    {
      key: "createdLabel",
      header: "Recorded",
      sortValue: (row: AdminSession) => row.createdAt,
      render: (row: AdminSession) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.createdLabel}</span>
      ),
    },
  ];

  const sharedTableProps = {
    columns,
    pageSize: 10,
    searchPlaceholder: "Search session, topic or intern",
    searchKeys: ["code", "topic", "intern", "state"] as (keyof AdminSession)[],
    activeFilterCount: stateFilter === "all" ? 0 : 1,
    onRowClick: (row: AdminSession) => setDetail(row),
    mobilePrimary: (row: AdminSession) => ({
      title: row.code,
      subtitle: `${row.intern} · ${row.participants} speakers`,
    }),
    filterMenuContent: (
      <>
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          State
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={stateFilter === "all"}
          onCheckedChange={() => setStateFilter("all")}
          onSelect={(event) => event.preventDefault()}
        >
          All states
        </DropdownMenuCheckboxItem>
        {STATES.map((state) => (
          <DropdownMenuCheckboxItem
            key={state}
            checked={stateFilter === state}
            onCheckedChange={() => setStateFilter(state)}
            onSelect={(event) => event.preventDefault()}
          >
            {state}
          </DropdownMenuCheckboxItem>
        ))}
      </>
    ),
  };

  return (
    <DesktopPageShell className="py-4">
      <AdminPageHeader id="focus-groups" />

      {isLoading ? (
        <AdminPageSkeleton charts={0} chartColumns={3} table={true} />
      ) : (
        <>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          variant="accent"
          title="Sessions"
          value={String(rows.length)}
          icon={UsersGroupTwoRounded}
        />
        <MetricCard
          title="Hours recorded"
          value={`${totalHours}h`}
          icon={ClockCircle}
        />
        <MetricCard
          title="Speakers captured"
          value={String(participants)}
          icon={Microphone3}
        />
        <MetricCard
          title="Missing audio"
          value={String(missingAudio.length)}
          trend={{
            label: missingAudio.length > 0 ? "never reach annotation" : "",
            positive: false,
            neutral: true,
          }}
          icon={DangerTriangle}
        />
      </div>

      <Tabs className="mt-3" value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TabsList className="h-9 rounded-full bg-alva-surface p-1">
          <TabsTrigger
            value="all"
            className="rounded-full px-4 text-sm data-[state=active]:bg-alva-card data-[state=active]:text-foreground"
          >
            All sessions
          </TabsTrigger>
          <TabsTrigger
            value="no-audio"
            className="rounded-full px-4 text-sm data-[state=active]:bg-alva-card data-[state=active]:text-foreground"
          >
            <span className="flex items-center gap-2">
              Missing audio
              {missingAudio.length > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/20 px-1.5 text-[10px] font-semibold text-red-400">
                  {missingAudio.length}
                </span>
              ) : null}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-2">
          <AlvaDataTable
            {...sharedTableProps}
            title={tab === "no-audio" ? "Sessions with no audio" : "All sessions"}
            rows={filtered}
            emptyState={{
              icon: <UsersGroupTwoRounded size={20} weight="Outline" />,
              title:
                tab === "no-audio"
                  ? "Every session has its audio"
                  : "No sessions match",
              description:
                tab === "no-audio"
                  ? "Nothing an intern recorded is stuck."
                  : "Clear the state filter to see the rest.",
            }}
          />
        </TabsContent>
      </Tabs>

      <SessionDetailPanel
        open={detail !== null}
        onOpenChange={(next) => !next && setDetail(null)}
        session={detail}
        onAssign={(row: AdminSession) => setAssigning(row)}
      />

      <AssignAnnotatorDialog
        open={assigning !== null}
        onOpenChange={(next) => !next && setAssigning(null)}
        subject={assigning ? `${assigning.code} · ${assigning.topic}` : null}
        onAssign={(annotator) => {
          alvaToast.success(`${assigning?.code} assigned to ${annotator}`);
          setAssigning(null);
        }}
      />
        </>
      )}
    </DesktopPageShell>
  );
}
