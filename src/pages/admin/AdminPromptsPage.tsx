import { useMemo, useState } from "react";
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
import { DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminPageSkeleton } from "@/components/admin/shared/AdminPageSkeleton";
import { AdminStatusPill } from "@/components/admin/shared/AdminStatusPill";
import { BankItemSheet } from "@/components/admin/prompts/BankItemSheet";
import { CreateBankItemDialog } from "@/components/admin/prompts/CreateBankItemDialog";
import type { BankDraft } from "@/components/admin/prompts/BankItemForm";
import {
  BANK_ITEMS,
  EMPTY_BANK_METRICS,
  bankMetrics,
  type BankItem,
  type BankKind,
} from "@/data/admin/prompts";
import { alvaToast } from "@/lib/alva-toast";
import { useDevRows, useSimulatedLoading } from "@/hooks/use-dev-ui-state";

type ActiveFilter = "all" | "active" | "retired";

/**
 * The prompt and stimulus banks.
 *
 * Top of the build order, and not for UI reasons: an empty bank means every
 * contributor opens the studio to nothing to record. The number this page is
 * really for is "unused" — an active prompt with no recordings against it is
 * either unreachable or not worth keeping, and nothing else surfaces that.
 */
export default function AdminPromptsPage() {
  const isLoading = useSimulatedLoading();
  const [kind, setKind] = useState<BankKind>("prompt");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("active");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<BankItem | null>(null);
  const [items, setItems] = useState<BankItem[]>(BANK_ITEMS);

  const rows = useDevRows(items);

  const forKind = useMemo(
    () => rows.filter((item) => item.kind === kind),
    [rows, kind]
  );

  const filtered = useMemo(
    () =>
      forKind.filter((item) =>
        activeFilter === "all"
          ? true
          : activeFilter === "active"
            ? item.isActive
            : !item.isActive
      ),
    [forKind, activeFilter]
  );

  const isEmpty = rows.length === 0;
  const metrics = isEmpty ? EMPTY_BANK_METRICS : bankMetrics(forKind);

  const handleSave = (draft: BankDraft) => {
    if (!editing) return;
    setItems((prev) =>
      prev.map((item) => (item.id === editing.id ? { ...item, ...draft } : item))
    );
    alvaToast.success("Saved");
  };

  const handleCreate = (draft: BankDraft) => {
    const created: BankItem = {
      id: `${kind === "prompt" ? "p" : "s"}-${crypto.randomUUID().slice(0, 6)}`,
      kind,
      ...draft,
      isActive: true,
      usedByCount: 0,
      createdAt: Date.now(),
      createdLabel: "Just now",
    };
    setItems((prev) => [created, ...prev]);
    alvaToast.success(`${kind === "prompt" ? "Prompt" : "Stimulus"} added`);
  };

  const handleRetire = (item: BankItem) => {
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, isActive: false } : row))
    );
    alvaToast.show("Retired — existing recordings keep working", {
      variant: "default",
    });
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
      sortValue: (row: BankItem) => row.category,
      render: (row: BankItem) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.category}</span>
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
          onCheckedChange={() => setActiveFilter(value)}
          onSelect={(event) => event.preventDefault()}
        >
          {value === "all" ? "All" : value === "active" ? "Active only" : "Retired only"}
        </DropdownMenuCheckboxItem>
      ))}
    </>
  );

  return (
    <DesktopPageShell className="py-4">
      <AdminPageHeader
        id="prompts"
        actions={
          <TextureButton
            variant="alva"
            size="sm"
            className="w-auto"
            onClick={() => setCreateOpen(true)}
          >
            <AddCircle size={15} weight="Outline" />
            New {kind === "prompt" ? "prompt" : "stimulus"}
          </TextureButton>
        }
      />

      {isLoading ? (
        <AdminPageSkeleton charts={0} chartColumns={3} table={true} />
      ) : (
        <>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          variant="accent"
          title="In this bank"
          value={metrics.total}
          trend={{ label: "", positive: false, neutral: true }}
          period=""
          icon={Notebook2}
        />
        <MetricCard
          title="Active"
          value={metrics.active}
          trend={{ label: "", positive: false, neutral: true }}
          period=""
          icon={CheckCircle}
        />
        <MetricCard
          title="Never recorded"
          value={metrics.unused}
          trend={{ label: "", positive: false, neutral: true }}
          period=""
          icon={DangerTriangle}
        />
        <MetricCard
          title="Recordings made"
          value={metrics.recordings}
          trend={{ label: "", positive: false, neutral: true }}
          period=""
          icon={Microphone3}
        />
      </div>

      <Tabs
        className="mt-3"
        value={kind}
        onValueChange={(value) => setKind(value as BankKind)}
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
        </TabsList>

        <TabsContent value={kind} className="mt-2">
          <AlvaDataTable
            title={kind === "prompt" ? "Prompt bank" : "Stimulus bank"}
            rows={filtered}
            columns={columns}
            pageSize={10}
            searchPlaceholder="Search text or category"
            searchKeys={["text", "category", "variety"]}
            activeFilterCount={activeFilter === "active" ? 0 : 1}
            filterMenuContent={filterMenu}
            onRowClick={(row) => {
              setEditing(row);
              setSheetOpen(true);
            }}
            mobilePrimary={(row) => ({
              title: row.text,
              subtitle: `${row.category} · ${row.usedByCount} recordings`,
            })}
            emptyState={{
              icon: <Notebook2 size={20} weight="Outline" />,
              title: `No ${kind === "prompt" ? "prompts" : "stimuli"} here`,
              description:
                activeFilter === "retired"
                  ? "Nothing has been retired yet."
                  : "Add one so contributors have something to record.",
            }}
          />
        </TabsContent>
      </Tabs>

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
