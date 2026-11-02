import { useState } from "react";
import Notebook2 from "@solar-icons/react/school/Notebook2";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import DangerTriangle from "@solar-icons/react/ui/DangerTriangle";
import Microphone3 from "@solar-icons/react/video/Microphone3";
import AddCircle from "@solar-icons/react/ui/AddCircle";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { AlvaDataTable, TruncateCell } from "@/components/shared/AlvaDataTable";
import { TextureButton } from "@/components/ui/texture-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AltArrowDown from "@solar-icons/react/arrows/AltArrowDown";
import Upload from "@solar-icons/react/arrows-action/Upload";
import { AdminPageSkeleton } from "@/components/admin/shared/AdminPageSkeleton";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminStatusPill } from "@/components/admin/shared/AdminStatusPill";
import { BankItemSheet } from "@/components/admin/prompts/BankItemSheet";
import { CreateBankItemDialog } from "@/components/admin/prompts/CreateBankItemDialog";
import { ImportBankCsvDialog } from "@/components/admin/prompts/ImportBankCsvDialog";
import type { BankDraft } from "@/components/admin/prompts/BankItemForm";
import {
  EMPTY_BANK_TOTALS,
  type BankItem,
  type BankKind,
  BANK_CATEGORY_LABELS,
  bankCategory,
} from "@/data/admin/prompts";
import { alvaToast } from "@/lib/alva-toast";
import { BatchImportError, importInBatches } from "@/lib/admin/bankCsv";
import { useBank } from "@/hooks/useBank";
import { reportApiError } from "@/lib/api/reportApiError";
import { ApiError } from "@/lib/api/client";

type ActiveFilter = "all" | "active" | "retired";
type RecordedFilter = "all" | "recorded" | "never";

/** Rows per page of the table, and per request for prompts and stimuli. */
const PAGE_SIZE = 25;

/** A count the API did not give reads as a dash, not as a confident zero. */
function count(value: number | null) {
  return value == null ? "—" : value.toLocaleString();
}

/**
 * The prompt and stimulus banks.
 *
 * Top of the build order, and not for UI reasons: an empty bank means every
 * contributor opens the studio to nothing to record. The number this page is
 * really for is "unused" — an active prompt with no recordings against it is
 * either unreachable or not worth keeping, and nothing else surfaces that.
 */
export default function AdminPromptsPage() {
  /* Three tabs, three banks. Topics used to be prompts wearing a category;
   * they have their own endpoint now, so the tab and the kind are the same
   * thing again. */
  const [kind, setKind] = useState<BankKind>("prompt");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("active");
  const [recordedFilter, setRecordedFilter] = useState<RecordedFilter>("all");
  const [page, setPage] = useState(1);

  /* Any change of what is listed starts again from the first page. Page 40
     of the unrecorded prompts is not page 40 of the recorded ones. Done in
     the same update, not an effect after it, so the old page is never
     requested for the new list. */
  const showKind = (next: BankKind) => {
    setKind(next);
    setPage(1);
  };
  const showActive = (next: ActiveFilter) => {
    setActiveFilter(next);
    setPage(1);
  };
  const showRecorded = (next: RecordedFilter) => {
    setRecordedFilter(next);
    setPage(1);
  };

  const {
    items,
    total,
    totals,
    isLoading,
    isFetching,
    error,
    reload,
    create,
    save,
    retire,
    importCsv,
  } = useBank({
    kind,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
    /* Topics have no recorded filter on the API, and are not recorded
       against in the same way. */
    recorded:
      kind === "topic" || recordedFilter === "all"
        ? undefined
        : recordedFilter === "recorded",
    page,
    pageSize: PAGE_SIZE,
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<BankItem | null>(null);

  /* From the server, for the whole bank, whatever page the table is on. */
  const metrics = totals ?? EMPTY_BANK_TOTALS;
  const serverPaged = kind !== "topic";

  const report = (cause: unknown, fallback: string) => {
    const message = reportApiError(cause, fallback);
    if (message) alvaToast.error(message);
  };

  const handleSave = async (draft: BankDraft) => {
    if (!editing) return;
    try {
      await save(kind, editing.id, draft);
      alvaToast.success("Saved");
    } catch (cause) {
      report(cause, "Could not save that item.");
    }
  };

  const handleCreate = async (draft: BankDraft) => {
    try {
      await create(kind, draft);
      alvaToast.success(
        kind === "topic"
          ? "Topic added"
          : kind === "stimulus"
            ? "Stimulus added"
            : "Prompt added"
      );
    } catch (cause) {
      report(cause, "Could not add that item.");
    }
  };

  const handleRetire = async (item: BankItem) => {
    try {
      await retire(kind, item.id);
      alvaToast.show("Retired, existing recordings keep working", {
        variant: "default",
      });
    } catch (cause) {
      report(cause, "Could not retire that item.");
    }
  };

  const columns = [
    {
      key: "text",
      header: kind === "prompt" ? "Prompt" : "Stimulus",
      sortValue: (row: BankItem) => row.text,
      render: (row: BankItem) => (
        <TruncateCell className="max-w-xl text-foreground" title={row.text}>
          {row.text}
        </TruncateCell>
      ),
    },
    {
      key: "variety",
      header: "Variety",
      sortValue: (row: BankItem) => row.variety,
      render: (row: BankItem) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.variety}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortValue: (row: BankItem) => bankCategory(row),
      render: (row: BankItem) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {BANK_CATEGORY_LABELS[bankCategory(row)]}
        </span>
      ),
    },
    {
      key: "usedByCount",
      header: "Recorded",
      sortValue: (row: BankItem) => row.usedByCount,
      render: (row: BankItem) =>
        row.usedByCount === 0 ? (
          <AdminStatusPill tone="pending">Never</AdminStatusPill>
        ) : (
          <span className="tabular-nums text-muted-foreground">{row.usedByCount}</span>
        ),
    },
    {
      key: "isActive",
      header: "Status",
      sortValue: (row: BankItem) => String(row.isActive),
      render: (row: BankItem) => (
        <AdminStatusPill tone={row.isActive ? "good" : "neutral"}>
          {row.isActive ? "Active" : "Retired"}
        </AdminStatusPill>
      ),
    },
    {
      key: "createdLabel",
      header: "Added",
      sortValue: (row: BankItem) => row.createdAt,
      render: (row: BankItem) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.createdLabel}</span>
      ),
    },
  ];

  const filterMenu = (
    <>
      <DropdownMenuLabel className="text-xs text-muted-foreground">
        Status
      </DropdownMenuLabel>
      {(["active", "retired", "all"] as ActiveFilter[]).map((value) => (
        <DropdownMenuCheckboxItem
          key={value}
          checked={activeFilter === value}
          onCheckedChange={() => showActive(value)}
          onSelect={(event) => event.preventDefault()}
        >
          {value === "all" ? "All" : value === "active" ? "Active only" : "Retired only"}
        </DropdownMenuCheckboxItem>
      ))}
      {/* Sent to the API as `recorded`, so it covers the whole bank. The
          headline numbers do not move with it. */}
      {kind !== "topic" ? (
        <>
          <DropdownMenuLabel className="mt-1 text-xs text-muted-foreground">
            Recordings
          </DropdownMenuLabel>
          {(["all", "recorded", "never"] as RecordedFilter[]).map((value) => (
            <DropdownMenuCheckboxItem
              key={value}
              checked={recordedFilter === value}
              onCheckedChange={() => showRecorded(value)}
              onSelect={(event) => event.preventDefault()}
            >
              {value === "all" ? "All" : value === "recorded" ? "Recorded" : "Never recorded"}
            </DropdownMenuCheckboxItem>
          ))}
        </>
      ) : null}
    </>
  );

  return (
    <DesktopPageShell className="py-4">
      <AdminPageHeader
        id="prompts"
        actions={
          /* One button, two ways in. Adding one and loading two hundred are
             the same intent at different scales, so they share a control
             rather than competing for the same corner. */
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TextureButton variant="alva" size="sm" className="w-auto">
                <AddCircle size={15} weight="Outline" />
                Add {kind === "prompt" ? "prompts" : "stimuli"}
                <AltArrowDown size={14} weight="Outline" />
              </TextureButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-2xl border-alva-border bg-alva-card p-1.5"
            >
              <DropdownMenuItem
                className="gap-2 rounded-xl"
                onSelect={() => setCreateOpen(true)}
              >
                <AddCircle size={15} weight="Outline" />
                Write one
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 rounded-xl"
                onSelect={() => setImportOpen(true)}
              >
                <Upload size={15} weight="Outline" />
                Import a CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      {/* `bank_total` and `recorded_total`, not rows counted off a page. A
          page is newest first and the recorded prompts were on page fifty,
          which is how these all read zero with nothing lost. The sum of
          recordings that used to sit here has no server total, so it went
          with the row counting. */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          variant="accent"
          title="In this bank"
          value={count(metrics.bank)}
          icon={Notebook2}
        />
        <MetricCard
          title="Active"
          value={count(metrics.active)}
          icon={CheckCircle}
        />
        <MetricCard
          title="Recorded"
          value={count(metrics.recorded)}
          icon={Microphone3}
        />
        <MetricCard
          title="Active, never recorded"
          value={count(metrics.neverRecorded)}
          icon={DangerTriangle}
        />
      </div>

      <Tabs
        className="mt-3"
        value={kind}
        onValueChange={(value) => showKind(value as BankKind)}
      >
        <TabsList className="h-9 rounded-full bg-alva-surface p-1">
          <TabsTrigger
            value="prompt"
            className="rounded-full px-4 text-sm data-[state=active]:bg-alva-card data-[state=active]:text-foreground"
          >
            Prompts
          </TabsTrigger>
          <TabsTrigger
            value="stimulus"
            className="rounded-full px-4 text-sm data-[state=active]:bg-alva-card data-[state=active]:text-foreground"
          >
            Stimuli
          </TabsTrigger>
          {/* No endpoint of its own. Topics live in the prompts bank under
              `category="focus_group_topic"` until one exists. */}
          <TabsTrigger
            value="topic"
            className="rounded-full px-4 text-sm data-[state=active]:bg-alva-card data-[state=active]:text-foreground"
          >
            Focus group topics
          </TabsTrigger>
        </TabsList>

        <TabsContent value={kind} className="mt-2">
          <AlvaDataTable
            title={
              kind === "topic"
                ? "Focus group topics"
                : kind === "stimulus"
                  ? "Stimulus bank"
                  : "Prompt bank"
            }
            rows={items}
            columns={columns}
            pageSize={serverPaged ? PAGE_SIZE : 10}
            isLoading={isFetching}
            serverPaging={
              serverPaged ? { total, page, onPageChange: setPage } : undefined
            }
            searchPlaceholder="Search text or variety"
            searchKeys={["text", "variety"]}
            activeFilterCount={
              (activeFilter === "active" ? 0 : 1) +
              (serverPaged && recordedFilter !== "all" ? 1 : 0)
            }
            filterMenuContent={filterMenu}
            onRowClick={(row) => {
              setEditing(row);
              setSheetOpen(true);
            }}
            mobilePrimary={(row) => ({
              title: row.text,
              subtitle: `${BANK_CATEGORY_LABELS[bankCategory(row)]} · ${row.usedByCount} recordings`,
            })}
            emptyState={{
              icon: <Notebook2 size={20} weight="Outline" />,
              title: `No ${kind === "prompt" ? "prompts" : "stimuli"} here`,
              description:
                serverPaged && recordedFilter === "recorded"
                  ? "Nothing here has been recorded yet."
                  : serverPaged && recordedFilter === "never"
                    ? "Everything here has been recorded at least once."
                    : activeFilter === "retired"
                      ? "Nothing has been retired yet."
                      : "Add one so contributors have something to record.",
            }}
          />
        </TabsContent>
      </Tabs>

      <ImportBankCsvDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        kind={kind}
        onImport={async (file, sent) => {
          /* In batches the route will take. A 60,000-row file is otherwise
             refused whole for being over its 5,000-row limit. */
          try {
            const result = await importInBatches(
              sent,
              (batch) => importCsv(kind, batch),
              file.name
            );
            /* The server reports all three outcomes. Saying only how many
               landed hides the rows that silently did not, and a duplicate
               is not the same news as a row that failed. */
            const parts = [`${result.added.toLocaleString()} added`];
            if (result.skipped > 0) {
              parts.push(`${result.skipped.toLocaleString()} already in the bank`);
            }
            if (result.failed > 0) {
              const first = result.firstFailure;
              parts.push(
                `${result.failed.toLocaleString()} failed${
                  first ? ` (line ${first.line}: ${first.reason})` : ""
                }`
              );
            }
            const message = parts.join(", ");
            if (result.failed > 0) alvaToast.error(message);
            else alvaToast.success(message);
          } catch (cause) {
            if (cause instanceof BatchImportError && cause.progress.sent > 0) {
              /* Not through `report`: it would swap this for the server's
                 message, and how far it got is the part worth keeping. */
              const { progress } = cause;
              const why =
                cause.cause instanceof ApiError ? `${cause.cause.message} ` : "";
              alvaToast.error(
                `${why}Stopped after ${progress.sent} of ${progress.batches} batches ` +
                  `(${progress.added.toLocaleString()} added). Import the same file ` +
                  `again to finish: rows already in the bank are skipped.`
              );
            } else {
              report(
                cause instanceof BatchImportError ? cause.cause : cause,
                "Could not import that file."
              );
            }
          }
        }}
      />

      <CreateBankItemDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        kind={kind}
        onCreate={handleCreate}
      />

      <BankItemSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        kind={kind}
        item={editing}
        onSave={handleSave}
        onRetire={handleRetire}
      />
        </>
      )}
    </DesktopPageShell>
  );
}
