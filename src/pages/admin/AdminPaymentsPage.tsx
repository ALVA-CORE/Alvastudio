import { useMemo, useState } from "react";
import Wallet from "@solar-icons/react/money/Wallet";
import BillList from "@solar-icons/react/money/BillList";
import BillCheck from "@solar-icons/react/money/BillCheck";
import ClockSquare from "@solar-icons/react/time/ClockSquare";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import Upload from "@solar-icons/react/arrows-action/Upload";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { AlvaChartCard } from "@/components/shared/AlvaChartCard";
import { AlvaDataTable } from "@/components/shared/AlvaDataTable";
import { TextureButton } from "@/components/ui/texture-button";
import { Input } from "@/components/ui/input";
import { DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminPageSkeleton } from "@/components/admin/shared/AdminPageSkeleton";
import { AdminStatusPill, type PillTone } from "@/components/admin/shared/AdminStatusPill";
import { EarningDetailPanel } from "@/components/admin/payments/EarningDetailPanel";
import {
  EARNINGS,
  EMPTY_PAYMENT_METRICS,
  PAYOUT_STATUS_LABELS,
  RATES,
  RATE_UNIT_LABELS,
  earningsToCsv,
  formatNaira,
  paymentMetrics,
  type Earning,
  type PayoutStatus,
  type Rate,
} from "@/data/admin/payments";
import { alvaFieldClass } from "@/lib/alva-form-styles";
import { downloadCsv } from "@/lib/download-csv";
import { alvaToast } from "@/lib/alva-toast";
import { useDevRows, useSimulatedLoading } from "@/hooks/use-dev-ui-state";
import { cn } from "@/lib/utils";

type StatusFilter = PayoutStatus | "all";

const STATUS_TONE: Record<PayoutStatus, PillTone> = {
  paid: "good",
  processing: "pending",
  pending: "neutral",
};

/**
 * Rates and what they add up to.
 *
 * Rates sit above earnings because changing one is the only write on this page
 * and it changes every number below it. Money is held in kobo throughout — a
 * payment run that does float arithmetic on naira will eventually be a rounding
 * complaint from someone who was underpaid by a kobo.
 */
export default function AdminPaymentsPage() {
  const isLoading = useSimulatedLoading();
  const [rates, setRates] = useState<Rate[]>(RATES);
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [draftAmount, setDraftAmount] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [earnings, setEarnings] = useState<Earning[]>(EARNINGS);
  const [detail, setDetail] = useState<Earning | null>(null);

  const rows = useDevRows(earnings);
  const isEmpty = rows.length === 0;
  const metrics = isEmpty ? EMPTY_PAYMENT_METRICS : paymentMetrics(rows);

  const filtered = useMemo(
    () => (status === "all" ? rows : rows.filter((row) => row.status === status)),
    [rows, status]
  );

  /* Bars are relative to the highest rate, so the shape says "this one pays
   * about half what that one does" without reading two numbers. */
  const maxRate = Math.max(...rates.map((rate) => rate.amountKobo), 1);

  const startEdit = (rate: Rate) => {
    setEditingUnit(rate.unit);
    setDraftAmount((rate.amountKobo / 100).toFixed(2));
  };

  const commitEdit = (rate: Rate) => {
    const naira = Number(draftAmount);
    if (!Number.isFinite(naira) || naira < 0) {
      alvaToast.error("That is not an amount");
      return;
    }

    setRates((prev) =>
      prev.map((row) =>
        row.unit === rate.unit
          ? {
              ...row,
              amountKobo: Math.round(naira * 100),
              updatedLabel: "Just now",
              updatedAt: Date.now(),
            }
          : row
      )
    );
    setEditingUnit(null);
    alvaToast.success(`${RATE_UNIT_LABELS[rate.unit]} rate updated`);
  };

  const advance = (row: Earning) => {
    setEarnings((prev) =>
      prev.map((entry) =>
        entry.id !== row.id
          ? entry
          : entry.status === "pending"
            ? { ...entry, status: "processing" }
            : { ...entry, status: "paid", paidKobo: entry.earnedKobo }
      )
    );
    alvaToast.success(
      row.status === "pending"
        ? `${row.contributor} queued for payment`
        : `${row.contributor} marked as paid`
    );
  };

  const columns = [
    {
      key: "contributor",
      header: "Contributor",
      sortValue: (row: Earning) => row.contributor,
      render: (row: Earning) => (
        <span className="font-medium text-foreground">{row.contributor}</span>
      ),
    },
    {
      key: "recordings",
      header: "Recordings",
      sortValue: (row: Earning) => row.recordings,
      render: (row: Earning) => (
        <span className="tabular-nums text-muted-foreground">{row.recordings}</span>
      ),
    },
    {
      key: "minutes",
      header: "Minutes",
      sortValue: (row: Earning) => row.minutes,
      render: (row: Earning) => (
        <span className="tabular-nums text-muted-foreground">{row.minutes}</span>
      ),
    },
    {
      key: "earnedKobo",
      header: "Earned",
      sortValue: (row: Earning) => row.earnedKobo,
      render: (row: Earning) => (
        <span className="whitespace-nowrap tabular-nums text-foreground">
          {formatNaira(row.earnedKobo)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Payout",
      sortValue: (row: Earning) => row.status,
      render: (row: Earning) => (
        <AdminStatusPill tone={STATUS_TONE[row.status]}>
          {PAYOUT_STATUS_LABELS[row.status]}
        </AdminStatusPill>
      ),
    },
    {
      key: "lastActivityLabel",
      header: "Last active",
      sortValue: (row: Earning) => row.lastActivityAt,
      render: (row: Earning) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {row.lastActivityLabel}
        </span>
      ),
    },
  ];

  return (
    <DesktopPageShell className="py-4">
      <AdminPageHeader
        id="payments"
        actions={
          <TextureButton
            variant="minimal"
            size="sm"
            className="w-auto"
            onClick={() => {
              downloadCsv("alva-earnings.csv", earningsToCsv(filtered));
              alvaToast.success(`Exported ${filtered.length} rows`);
            }}
          >
            <Upload size={15} weight="Outline" />
            Export CSV
          </TextureButton>
        }
      />

      {isLoading ? (
        <AdminPageSkeleton charts={1} chartColumns={1} table={true} />
      ) : (
        <>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          variant="accent"
          title="Owed"
          value={metrics.owed}
          trend={{ label: "not yet paid out", positive: false, neutral: true }}
          period=""
          icon={Wallet}
        />
        <MetricCard
          title="Paid to date"
          value={metrics.paid}
          trend={{ label: "", positive: false, neutral: true }}
          period=""
          icon={BillList}
        />
        <MetricCard
          title="Contributors"
          value={metrics.contributors}
          trend={{ label: "", positive: false, neutral: true }}
          period=""
          icon={UsersGroupRounded}
        />
        <MetricCard
          title="Awaiting payment"
          value={metrics.pending}
          trend={{ label: "", positive: false, neutral: true }}
          period=""
          icon={ClockCircle}
        />
      </div>

      <AlvaChartCard
        title="What each unit of work pays"
        subtitle="Change a rate and every figure below is calculated from the new one"
        className="mt-2"
      >
        {/* Bars, not a list of numbers. The question a rate card answers is
            "is annotation paid fairly against recording", and a column of
            currency strings makes you do that comparison in your head. */}
        <ul className="alva-thin-scrollbar max-h-[15rem] space-y-3 overflow-y-auto pr-1">
          {rates.map((rate) => {
            const share = rate.amountKobo / maxRate;
            const isEditing = editingUnit === rate.unit;

            return (
              <li key={rate.unit}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-foreground">
                    {RATE_UNIT_LABELS[rate.unit]}
                  </span>

                  {isEditing ? (
                    <span className="flex shrink-0 items-center gap-2">
                      <Input
                        autoFocus
                        inputMode="decimal"
                        aria-label={`${RATE_UNIT_LABELS[rate.unit]} rate in naira`}
                        value={draftAmount}
                        onChange={(event) => setDraftAmount(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") commitEdit(rate);
                          if (event.key === "Escape") setEditingUnit(null);
                        }}
                        wrapperClassName="w-28"
                        className="h-9 text-right tabular-nums"
                      />
                      <TextureButton
                        variant="alva"
                        size="sm"
                        className="w-auto"
                        onClick={() => commitEdit(rate)}
                      >
                        Save
                      </TextureButton>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(rate)}
                      title={`Updated ${rate.updatedLabel} by ${rate.updatedBy}`}
                      className="shrink-0 rounded-full px-2.5 py-1 text-sm tabular-nums text-foreground transition-colors hover:bg-alva-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
                    >
                      {formatNaira(rate.amountKobo)}
                    </button>
                  )}
                </div>

                <div
                  aria-hidden
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-alva-surface"
                >
                  <div
                    className="h-full rounded-full bg-alva-accent transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.max(share * 100, 4)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </AlvaChartCard>

      <div className="mt-2">
        <AlvaDataTable
          title="Earnings"
          rows={filtered}
          columns={columns}
          pageSize={10}
          searchPlaceholder="Search contributor"
          searchKeys={["contributor"]}
          activeFilterCount={status === "all" ? 0 : 1}
          onRowClick={(row: Earning) => setDetail(row)}
          mobilePrimary={(row) => ({
            title: row.contributor,
            subtitle: `${formatNaira(row.earnedKobo)} · ${PAYOUT_STATUS_LABELS[row.status]}`,
          })}
          filterMenuContent={
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Payout status
              </DropdownMenuLabel>
              {(["all", "pending", "processing", "paid"] as StatusFilter[]).map((value) => (
                <DropdownMenuCheckboxItem
                  key={value}
                  checked={status === value}
                  onCheckedChange={() => setStatus(value)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {value === "all" ? "All" : PAYOUT_STATUS_LABELS[value]}
                </DropdownMenuCheckboxItem>
              ))}
            </>
          }
          emptyState={{
            icon: <Wallet size={20} weight="Outline" />,
            title: "Nothing to pay",
            description: "Earnings appear once contributors submit approved work.",
          }}
        />
      </div>

      <EarningDetailPanel
        open={detail !== null}
        onOpenChange={(next) => !next && setDetail(null)}
        earning={detail}
        onAdvance={(row) => {
          advance(row);
          setDetail(null);
        }}
      />
        </>
      )}
    </DesktopPageShell>
  );
}
