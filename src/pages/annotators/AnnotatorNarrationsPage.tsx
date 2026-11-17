import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatRoundDots from "@solar-icons/react/messages/ChatRoundDots";
import Clipboard from "@solar-icons/react/notes/Clipboard";
import ClipboardCheck from "@solar-icons/react/notes/ClipboardCheck";
import { AnnotatorMobileGate } from "@/components/annotators/layout/AnnotatorMobileGate";
import { SessionStatusBadge } from "@/components/annotators/sessions/SessionStatusBadge";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import {
  AlvaDataTable,
  TruncateCell,
  type AlvaTableColumn,
} from "@/components/shared/AlvaDataTable";
import { TextureButton } from "@/components/ui/texture-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnnotationStatus } from "@/data/annotators/sessions";
import { useApiResource } from "@/hooks/useApiResource";
import { STATUS_MAP } from "@/hooks/useAnnotatorSessions";
import { useIsMobile } from "@/hooks/use-mobile";
import { claimNextNarration, listMine, listNarrationQueue } from "@/lib/api/annotations";
import { annotatorDashboard } from "@/lib/api/dashboard";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";
import { formatDuration, lengthOf } from "@/lib/duration";
import { NO_VALUE } from "@/lib/no-value";
import { cn } from "@/lib/utils";

type Tab = "open" | "waiting" | "completed";

/** One of this annotator's narrations. */
type MineRow = { id: string; stimulus: string; durationSec: number; status: AnnotationStatus };

/** A narration in the pool. Its id is the recording's: nobody holds it yet. */
type PoolRow = { id: string; stimulus: string; category: string; durationSec: number };

/** What both tables show. */
type Shared = { id: string; stimulus: string; durationSec: number };

const TAB_TRIGGER =
  "rounded-full px-4 text-sm data-[state=active]:bg-alva-card data-[state=active]:text-foreground";

const lengthColumn: AlvaTableColumn<Shared> = {
  key: "duration",
  header: "Length",
  sortValue: (row) => row.durationSec,
  render: (row) => (
    <span className="tabular-nums text-muted-foreground">
      {row.durationSec > 0 ? formatDuration(row.durationSec) : NO_VALUE}
    </span>
  ),
};

const stimulusColumn: AlvaTableColumn<Shared> = {
  key: "stimulus",
  header: "Stimulus",
  sortValue: (row) => row.stimulus,
  render: (row) => (
    <TruncateCell className="max-w-xl text-foreground" title={row.stimulus}>
      {row.stimulus}
    </TruncateCell>
  ),
};

/**
 * `/annotator/narrations` — stimulus narrations, beside Sessions.
 *
 * Claimed from a pool, as sessions are, but one at a time from the top: the
 * pool is oldest first and there is no claiming a chosen one, so its rows
 * do not open anything.
 */
export default function AnnotatorNarrationsPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("open");
  const [isTaking, setTaking] = useState(false);

  const { data, isLoading, error, reload } = useApiResource(
    () =>
      Promise.all([
        listNarrationQueue({ limit: 200 }),
        listMine({ kind: "narration", limit: 200 }),
      ]),
    []
  );

  /* The open count and its limit exist only on the dashboard endpoint. */
  const { data: dashboard } = useApiResource(annotatorDashboard, []);
  const openClaims = dashboard?.open_narration_claims ?? 0;
  const claimLimit = dashboard?.narration_claim_limit ?? null;

  if (isMobile) {
    return <AnnotatorMobileGate />;
  }

  const pool: PoolRow[] = (data?.[0].items ?? []).map((row) => ({
    id: row.recording_id,
    stimulus: row.stimulus_text,
    category: row.category ?? NO_VALUE,
    durationSec: Math.round(lengthOf(row) ?? 0),
  }));

  const mine: MineRow[] = (data?.[1] ?? []).map((entry) => ({
    id: entry.id,
    stimulus: entry.topic ?? NO_VALUE,
    durationSec: Math.round(lengthOf(entry) ?? 0),
    status: STATUS_MAP[entry.status],
  }));
  const openRows = mine.filter((row) => row.status !== "completed");
  const completedRows = mine.filter((row) => row.status === "completed");

  /* 404 when the pool is empty and 409 at the limit both carry a sentence
     meant to be shown as it is. */
  const handleTake = async () => {
    setTaking(true);
    try {
      const document = await claimNextNarration();
      navigate(`/annotator/narrations/${document.id}`);
    } catch (cause) {
      const message = reportApiError(cause, "Could not take a narration.");
      if (message) alvaToast.error(message);
    } finally {
      setTaking(false);
    }
  };

  const mineColumns: AlvaTableColumn<MineRow>[] = [
    stimulusColumn,
    lengthColumn,
    {
      key: "status",
      header: "Status",
      sortValue: (row: MineRow) => row.status,
      render: (row: MineRow) => <SessionStatusBadge status={row.status} />,
    },
  ];

  const poolColumns: AlvaTableColumn<PoolRow>[] = [
    stimulusColumn,
    {
      key: "category",
      header: "Category",
      sortValue: (row: PoolRow) => row.category,
      render: (row: PoolRow) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.category}</span>
      ),
    },
    lengthColumn,
  ];

  const mobilePrimary = (row: Shared) => ({
    title: row.stimulus,
    subtitle: row.durationSec > 0 ? formatDuration(row.durationSec) : NO_VALUE,
  });

  return (
    <DesktopPageShell className="py-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold text-foreground">Narrations</h1>

          {claimLimit != null ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium",
                openClaims >= claimLimit
                  ? "bg-amber-500/15 text-amber-300"
                  : "bg-alva-surface text-muted-foreground"
              )}
            >
              {openClaims} of {claimLimit} open
            </span>
          ) : null}
        </div>

        <TextureButton
          variant="alva"
          size="sm"
          className="w-auto shrink-0"
          onClick={() => void handleTake()}
          loading={isTaking}
        >
          Take next
        </TextureButton>
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

      <Tabs className="mt-4" value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TabsList className="h-9 rounded-full bg-alva-surface p-1">
          <TabsTrigger value="open" className={TAB_TRIGGER}>
            <span className="flex items-center gap-2">
              To annotate
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-alva-accent px-1.5 text-[10px] font-semibold text-alva-bg">
                {openRows.length}
              </span>
            </span>
          </TabsTrigger>
          <TabsTrigger value="waiting" className={TAB_TRIGGER}>
            Waiting
          </TabsTrigger>
          <TabsTrigger value="completed" className={TAB_TRIGGER}>
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-2">
          <AlvaDataTable
            title="Narrations to annotate"
            rows={openRows}
            columns={mineColumns}
            pageSize={8}
            isLoading={isLoading}
            searchPlaceholder="Search"
            onRowClick={(row) => navigate(`/annotator/narrations/${row.id}`)}
            mobilePrimary={mobilePrimary}
            emptyState={{
              icon: <ChatRoundDots size={20} weight="Outline" />,
              title: "No narrations to annotate",
            }}
          />
        </TabsContent>

        <TabsContent value="waiting" className="mt-2">
          <AlvaDataTable
            title="Narrations waiting"
            rows={pool}
            columns={poolColumns}
            pageSize={8}
            isLoading={isLoading}
            searchPlaceholder="Search"
            mobilePrimary={mobilePrimary}
            emptyState={{
              icon: <Clipboard size={20} weight="Outline" />,
              title: "No narrations waiting",
            }}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-2">
          <AlvaDataTable
            title="Completed narrations"
            rows={completedRows}
            columns={mineColumns}
            pageSize={8}
            isLoading={isLoading}
            searchPlaceholder="Search"
            onRowClick={(row) => navigate(`/annotator/narrations/${row.id}`)}
            mobilePrimary={mobilePrimary}
            emptyState={{
              icon: <ClipboardCheck size={20} weight="Outline" />,
              title: "No completed narrations yet",
            }}
          />
        </TabsContent>
      </Tabs>
    </DesktopPageShell>
  );
}
