import { useMemo, useState } from "react";
import Wallet from "@solar-icons/react/money/Wallet";
import BillList from "@solar-icons/react/money/BillList";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import Upload from "@solar-icons/react/arrows-action/Upload";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { RateRings } from "@/components/admin/payments/RateRings";
import { useRates } from "@/hooks/useRates";
import { useEarnings } from "@/hooks/useEarnings";
import { usePayouts } from "@/hooks/usePayouts";
import { RunPaymentDialog } from "@/components/admin/payments/RunPaymentDialog";
import BillCheck from "@solar-icons/react/money/BillCheck";
import { reportApiError } from "@/lib/api/reportApiError";
import { AlvaChartCard } from "@/components/shared/AlvaChartCard";
import { AlvaEmptyState } from "@/components/shared/states/AlvaEmptyState";
import { AlvaDataTable } from "@/components/shared/AlvaDataTable";
import { TextureButton } from "@/components/ui/texture-button";
import { DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminPageSkeleton } from "@/components/admin/shared/AdminPageSkeleton";
import { AdminStatusPill, type PillTone } from "@/components/admin/shared/AdminStatusPill";
import { EarningDetailPanel } from "@/components/admin/payments/EarningDetailPanel";
import {
  EMPTY_PAYMENT_METRICS,
  PAYOUT_STATUS_LABELS,
  RATE_UNIT_LABELS,
  earningsToCsv,
  formatNaira,
  paymentMetrics,
  type Earning,
  type PayoutStatus,
  type Rate,
} from "@/data/admin/payments";
import { downloadCsv } from "@/lib/download-csv";
import { alvaToast } from "@/lib/alva-toast";
import { useDevRows } from "@/hooks/use-dev-ui-state";
import { relativeDays } from "@/data/admin/shared";

/**
 * A run's outcome.
 *
 * `partial` is not a failure: a leg reported `unknown` settles by webhook or
 * reconciliation later, and the money is not lost. It is amber because it is
 * worth coming back to, not because anything is wrong.
 */
const RUN_LABEL: Record<string, string> = {
  in_progress: "Sending",
  completed: "Completed",
  partial: "Partly settled",
  failed: "Failed",
};

const RUN_TONE: Record<string, PillTone> = {
  in_progress: "pending",
  completed: "good",
  partial: "pending",
  failed: "bad",
};

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
  const {
    rates,
    isLoading: loadingRates,
    error: ratesError,
    save: saveRate,
    reload: reloadRates,
  } = useRates();
  const [status, setStatus] = useState<StatusFilter>("all");
  const {
    rows: earnings,
    isLoading: loadingEarnings,
    error: earningsError,
    reload: reloadEarnings,
  } = useEarnings();

  const isLoading = loadingEarnings;

  const payouts = usePayouts();
  const [runOpen, setRunOpen] = useState(false);
  const [detail, setDetail] = useState<Earning | null>(null);

  const rows = useDevRows(earnings);
  const isEmpty = rows.length === 0;
  const metrics = isEmpty ? EMPTY_PAYMENT_METRICS : paymentMetrics(rows);

  const filtered = useMemo(
    () => (status === "all" ? rows : rows.filter((row) => row.status === status)),
    [rows, status]
  );

  const commitEdit = async (rate: Rate, amount: string) => {
    const naira = Number(amount);
    if (!Number.isFinite(naira) || naira < 0) {
      alvaToast.error("That is not an amount");
      return;
    }

    try {
      await saveRate(rate.unit, naira);
      alvaToast.success(`${RATE_UNIT_LABELS[rate.unit]} rate updated`);
    } catch (cause) {
      const message = reportApiError(cause, "Could not change that rate.");
      if (message) alvaToast.error(message);
    }
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
          <div className="flex items-center gap-2">
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

            {/* The only way money moves. A run pays everybody eligible at
                once, which is why it lives here rather than on a row. */}
            <TextureButton
              variant="alva"
              size="sm"
              className="w-auto"
              disabled={(payouts.preview?.recipient_count ?? 0) === 0}
              onClick={() => setRunOpen(true)}
            >
              <BillCheck size={15} weight="Outline" />
              Run payment
            </TextureButton>
          </div>
        }
      />

      {earningsError ? (
        <div
          role="alert"
          className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400"
        >
          {earningsError}
          <button
            type="button"
            onClick={reloadEarnings}
            className="shrink-0 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            Retry
          </button>
        </div>
      ) : null}

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
          icon={Wallet}
        />
        <MetricCard
          title="Paid to date"
          value={metrics.paid}
          icon={BillList}
        />
        <MetricCard
          title="Contributors"
          value={metrics.contributors}
          icon={UsersGroupRounded}
        />
        <MetricCard
          title="Awaiting payment"
          value={metrics.pending}
          icon={ClockCircle}
        />
      </div>

      <AlvaChartCard
        title="What each unit of work pays"
        subtitle="Change a rate and every figure below is calculated from the new one"
        className="mt-2"
      >
        {ratesError ? (
          /* The rates are the one thing on this page an admin can change, so a
             failed load needs saying rather than leaving an empty card that
             looks like nothing has been set. */
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400"
          >
            {ratesError}
            <button
              type="button"
              onClick={reloadRates}
              className="shrink-0 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
            >
              Retry
            </button>
          </div>
        ) : !loadingRates && rates.length === 0 ? (
          <AlvaEmptyState
            icon={<BillList size={20} weight="Outline" />}
            title="No rates set"
            description="Nothing is being paid out until a rate exists for at least one unit of work."
          />
        ) : (
          <RateRings rates={rates} onSave={commitEdit} />
        )}
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

      {/* Every run already made. Nothing else on the admin surface shows
          these, so a failed leg had nowhere to be noticed. */}
      <div className="mt-2">
        <AlvaChartCard
          title="Payment runs"
          subtitle="What has gone out, and how it landed"
          className="min-h-[12rem]"
          emptyMessage={
            payouts.runs.length === 0
              ? { title: "No runs yet", description: "Nothing has been sent." }
              : undefined
          }
        >
          <dl className="alva-thin-scrollbar max-h-[15rem] space-y-1 overflow-y-auto pr-1">
            {payouts.runs.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between gap-3 border-b border-alva-border/50 py-2 last:border-0"
              >
                <dt className="min-w-0">
                  <span className="block truncate text-xs text-foreground">
                    {run.reference}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {relativeDays(new Date(run.created_at))}
                  </span>
                </dt>
                <dd className="flex shrink-0 items-center gap-3">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {run.succeeded_count}/{run.recipient_count}
                  </span>
                  <span className="text-xs tabular-nums text-foreground">
                    {formatNaira(Math.round(Number(run.total_amount) * 100))}
                  </span>
                  <AdminStatusPill tone={RUN_TONE[run.status]}>
                    {RUN_LABEL[run.status]}
                  </AdminStatusPill>
                </dd>
              </div>
            ))}
          </dl>
        </AlvaChartCard>
      </div>

      <RunPaymentDialog
        open={runOpen}
        onOpenChange={setRunOpen}
        preview={payouts.preview}
        isRunning={payouts.isRunning}
        onConfirm={async () => {
          try {
            const started = await payouts.run();
            setRunOpen(false);
            reloadEarnings();
            alvaToast.success(
              `${started.reference} sent to ${started.recipient_count} contributors`
            );
          } catch (cause) {
            const message = reportApiError(cause, "Could not start that run.");
            if (message) alvaToast.error(message);
          }
        }}
      />

      <EarningDetailPanel
        open={detail !== null}
        onOpenChange={(next) => !next && setDetail(null)}
        earning={detail}
        rates={rates}
        /* Reading only. Moving money is a pay run — `POST /payouts/runs` —
           not a per-row state change, and a button that looked like one was
           promising something the API does not do per contributor. */
        onAdvance={undefined}
      />
        </>
      )}
    </DesktopPageShell>
  );
}
