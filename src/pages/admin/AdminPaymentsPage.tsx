import { useMemo, useState } from "react";
import Wallet from "@solar-icons/react/money/Wallet";
import BillList from "@solar-icons/react/money/BillList";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import Download from "@solar-icons/react/arrows-action/Download";
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
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
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
  const [confirmRun, setConfirmRun] = useState(false);
  const [detail, setDetail] = useState<Earning | null>(null);

  const rows = useDevRows(earnings);
  const isEmpty = rows.length === 0;
  const metrics = isEmpty ? EMPTY_PAYMENT_METRICS : paymentMetrics(rows);

  const filtered = useMemo(
    () => (status === "all" ? rows : rows.filter((row) => row.status === status)),
    [rows, status]
  );

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

  /* Everyone who is owed and has not been started — what a run would pick up. */
  const payable = rows.filter((row) => row.status === "pending");
  const payableTotal = payable.reduce((sum, row) => sum + row.earnedKobo, 0);

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

  const runPayment = () => {
    setEarnings((prev) =>
      prev.map((entry) =>
        entry.status === "pending" ? { ...entry, status: "processing" } : entry
      )
    );
    setConfirmRun(false);
    alvaToast.success(`${payable.length} contributors queued for payment`);
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
          <>
            {payable.length > 0 ? (
              <TextureButton
                variant="alva"
                size="sm"
                className="w-auto"
                onClick={() => setConfirmRun(true)}
              >
                Run payment · {formatNaira(payableTotal)}
              </TextureButton>
            ) : null}
          <TextureButton
            variant="minimal"
            size="sm"
            className="w-auto"
            onClick={() => {
              downloadCsv("alva-earnings.csv", earningsToCsv(filtered));
              alvaToast.success(`Exported ${filtered.length} rows`);
            }}
          >
            <Download size={15} weight="Outline" />
            Export CSV
          </TextureButton>
          </>
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
        title="Rates"
        subtitle="What each unit of work pays. Changing one affects every figure below."
        className="mt-2"
      >
        <dl className="space-y-1">
          {rates.map((rate) => (
            <div
              key={rate.unit}
              className="flex items-center justify-between gap-3 border-b border-alva-border/50 py-2.5 last:border-0"
            >
              <dt className="min-w-0">
                <span className="block truncate text-sm text-foreground">
                  {RATE_UNIT_LABELS[rate.unit]}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Updated {rate.updatedLabel} by {rate.updatedBy}
                </span>
              </dt>

              <dd className="flex shrink-0 items-center gap-2">
                {editingUnit === rate.unit ? (
                  <>
                    <Input
                      autoFocus
                      inputMode="decimal"
                      value={draftAmount}
                      onChange={(event) => setDraftAmount(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") commitEdit(rate);
                        if (event.key === "Escape") setEditingUnit(null);
                      }}
                      className={cn(alvaFieldClass(), "h-9 w-28 text-right tabular-nums")}
                    />
                    <TextureButton
                      variant="alva"
                      size="sm"
                      className="w-auto"
                      onClick={() => commitEdit(rate)}
                    >
                      Save
                    </TextureButton>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(rate)}
                    className="rounded-full px-3 py-1.5 text-sm tabular-nums text-foreground transition-colors hover:bg-alva-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
                  >
                    {formatNaira(rate.amountKobo)}
                  </button>
                )}
              </dd>
            </div>
          ))}
        </dl>
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
          renderRowActions={(row) =>
            row.status === "paid" ? null : (
              <button
                type="button"
                onClick={() => advance(row)}
                className="whitespace-nowrap rounded-full bg-alva-surface px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-alva-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
              >
                {row.status === "pending" ? "Queue" : "Mark paid"}
              </button>
            )
          }
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
        </>
      )}
    </DesktopPageShell>
  );
}
