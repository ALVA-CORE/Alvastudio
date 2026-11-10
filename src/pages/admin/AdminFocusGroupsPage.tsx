import { useState } from "react";
import UsersGroupTwoRounded from "@solar-icons/react/users/UsersGroupTwoRounded";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import DangerTriangle from "@solar-icons/react/ui/DangerTriangle";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { AlvaDataTable, TruncateCell } from "@/components/shared/AlvaDataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { AdminPageSkeleton } from "@/components/admin/shared/AdminPageSkeleton";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminStatusPill } from "@/components/admin/shared/AdminStatusPill";
import { SessionDetailPanel } from "@/components/admin/sessions/SessionDetailPanel";
import { AssignAnnotatorDialog } from "@/components/admin/shared/AssignAnnotatorDialog";
import { TranscriptBackfillDialog } from "@/components/admin/sessions/TranscriptBackfillDialog";
import { TextureButton } from "@/components/ui/texture-button";
import ClapperboardText from "@solar-icons/react/video/ClapperboardText";
import { alvaToast } from "@/lib/alva-toast";
import type { AdminSession } from "@/data/admin/oversight";
import { STATES, round1 } from "@/data/admin/shared";
import { useAdminSessions } from "@/hooks/useAdminSessions";
import { assignSessionAnnotator, type ApiSessionSort } from "@/lib/api/focusGroups";
import { reportApiError } from "@/lib/api/reportApiError";

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
  const [tab, setTab] = useState<Tab>("all");
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: ApiSessionSort; order: "asc" | "desc" }>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detail, setDetail] = useState<AdminSession | null>(null);
  const [assigning, setAssigning] = useState<AdminSession | null>(null);

  const { rows, total, summary, isLoading, isFetching, error, reload } = useAdminSessions({
    hasAudio: tab === "no-audio" ? false : undefined,
    state: stateFilter === "all" ? undefined : stateFilter,
    q: query,
    sort,
    page,
    pageSize,
  });

  /* Any change of what is listed starts again from page one, in the same
     update, so the old page is never asked for under the new filter. */
  const showTab = (next: Tab) => {
    setTab(next);
    setPage(1);
  };
  const showState = (next: StateFilter) => {
    setStateFilter(next);
    setPage(1);
  };
  const search = (next: string) => {
    setQuery(next);
    setPage(1);
  };
  const sortBy = (key: string, order: "asc" | "desc") => {
    setSort({ key: key as ApiSessionSort, order });
    setPage(1);
  };

  /* Every count is the server's, over all sessions, whatever the table shows. */
  const missingAudio = summary?.missing_audio ?? 0;

  const columns = [
    {
      key: "code",
      header: "Session",
      render: (row: AdminSession) => (
        <span className="font-medium tabular-nums text-foreground">{row.code}</span>
      ),
    },
    {
      key: "topic",
      header: "Topic",
      serverSort: "topic",
      render: (row: AdminSession) => (
        <TruncateCell className="max-w-sm text-muted-foreground" title={row.topic}>
          {row.topic}
        </TruncateCell>
      ),
    },
    {
      key: "intern",
      header: "Intern",
      serverSort: "intern",
      render: (row: AdminSession) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.intern}</span>
      ),
    },
    {
      key: "state",
      header: "State",
      serverSort: "state",
      render: (row: AdminSession) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.state}</span>
      ),
    },
    {
      key: "participants",
      header: "Speakers",
      serverSort: "participant_count",
      render: (row: AdminSession) => (
        <span className="tabular-nums text-muted-foreground">{row.participants}</span>
      ),
    },
    {
      key: "duration",
      header: "Length",
      serverSort: "duration",
      render: (row: AdminSession) => (
        <span className="tabular-nums text-muted-foreground">{row.duration}</span>
      ),
    },
    {
      key: "hasAudio",
      header: "Audio",
      serverSort: "has_audio",
      render: (row: AdminSession) => (
        <AdminStatusPill tone={row.hasAudio ? "good" : "bad"}>
          {row.hasAudio ? "Uploaded" : "Missing"}
        </AdminStatusPill>
      ),
    },
    {
      key: "createdLabel",
      header: "Recorded",
      serverSort: "created_at",
      render: (row: AdminSession) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.createdLabel}</span>
      ),
    },
  ];

  const sharedTableProps = {
    columns,
    pageSize,
    isLoading: isFetching,
    serverPaging: {
      total,
      page,
      onPageChange: setPage,
      onPageSizeChange: setPageSize,
      onQueryChange: search,
      onSortChange: sortBy,
    },
    searchPlaceholder: "Search",
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
          onCheckedChange={() => showState("all")}
          onSelect={(event) => event.preventDefault()}
        >
          All states
        </DropdownMenuCheckboxItem>
        {STATES.map((state) => (
          <DropdownMenuCheckboxItem
            key={state}
            checked={stateFilter === state}
            onCheckedChange={() => showState(state)}
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
      <AdminPageHeader
        id="focus-groups"
        actions={
          /* A one-off for sessions recorded before transcription existed.
             It previews before it queues, because ElevenLabs bills on audio
             length and that is the number being approved. */
          <TextureButton
            variant="minimal"
            size="sm"
            className="w-auto"
            onClick={() => setBackfillOpen(true)}
          >
            <ClapperboardText size={15} weight="Outline" />
            Transcribe older
          </TextureButton>
        }
      />

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
        <AdminPageSkeleton charts={0} chartColumns={3} table={true} />
      ) : (
        <>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          variant="accent"
          title="Sessions"
          value={String(summary?.sessions ?? 0)}
          icon={UsersGroupTwoRounded}
        />
        <MetricCard
          title="Hours recorded"
          value={`${round1(summary?.hours_reported ?? 0)}h`}
          icon={ClockCircle}
        />
        <MetricCard
          title="Speakers captured"
          value={String(summary?.speakers_captured ?? 0)}
          icon={Microphone3}
        />
        <MetricCard
          title="Missing audio"
          value={String(missingAudio)}
          trend={{
            label: missingAudio > 0 ? "never reach annotation" : "",
            positive: false,
            neutral: true,
          }}
          icon={DangerTriangle}
        />
      </div>

      <Tabs className="mt-3" value={tab} onValueChange={(value) => showTab(value as Tab)}>
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
              {missingAudio > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/20 px-1.5 text-[10px] font-semibold text-red-400">
                  {missingAudio}
                </span>
              ) : null}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-2">
          <AlvaDataTable
            {...sharedTableProps}
            title={tab === "no-audio" ? "Sessions with no audio" : "All sessions"}
            rows={rows}
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
        onAssign={async (annotator) => {
          if (!assigning) return;
          try {
            await assignSessionAnnotator(assigning.id, annotator.id);
            alvaToast.success(`${assigning.code} assigned to ${annotator.name}`);
          } catch (cause) {
            const message = reportApiError(cause, "Could not assign that one.");
            if (message) alvaToast.error(message);
          }
          setAssigning(null);
        }}
      />
        </>
      )}
      <TranscriptBackfillDialog open={backfillOpen} onOpenChange={setBackfillOpen} />

    </DesktopPageShell>
  );
}
