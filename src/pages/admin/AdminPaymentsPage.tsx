import { useMemo, useState } from "react";
import Wallet from "@solar-icons/react/money/Wallet";
import BillList from "@solar-icons/react/money/BillList";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import Upload from "@solar-icons/react/arrows-action/Upload";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { useEarnings } from "@/hooks/useEarnings";
import { usePayouts } from "@/hooks/usePayouts";
import { RunPaymentDialog } from "@/components/admin/payments/RunPaymentDialog";
import BillCheck from "@solar-icons/react/money/BillCheck";
import { reportApiError } from "@/lib/api/reportApiError";
import { AlvaChartCard } from "@/components/shared/AlvaChartCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlvaDataTable } from "@/components/shared/AlvaDataTable";
import { TextureButton } from "@/components/ui/texture-button";
import { DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { AdminPageSkeleton } from "@/components/admin/shared/AdminPageSkeleton";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import MenuDots from "@solar-icons/react/ui/MenuDots";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BackPayDialog } from "@/components/admin/payments/BackPayDialog";
import { AdminStatusPill, type PillTone } from "@/components/admin/shared/AdminStatusPill";
import { EarningDetailPanel } from "@/components/admin/payments/EarningDetailPanel";
import { PayoutRunPanel } from "@/components/admin/payments/PayoutRunPanel";
import {
  EMPTY_PAYMENT_METRICS,
  PAYOUT_STATUS_LABELS,
  RUN_LABEL,
  RUN_TONE,
  bankSummary,
  earningsToCsv,
  formatNaira,
  formatNairaAmount,
  paymentMetrics,
  type Earning,
  type PayoutStatus,
} from "@/data/admin/payments";
import { downloadCsv } from "@/lib/download-csv";
import { alvaToast } from "@/lib/alva-toast";
import { relativeDays } from "@/data/admin/shared";
import { ApiError } from "@/lib/api/client";
import type { ApiPayoutRunItem } from "@/lib/api/payouts";

type Tab = "earnings" | "runs";

/**
 * What paying one person did, from its one leg. `open`: the leg needs a
 * retry or a reconcile, which its run's panel offers.
 */
function payOneOutcome(leg: ApiPayoutRunItem | undefined) {
  if (leg?.status === "transferred") {
    if (leg.bank_status === "paid") return { good: true, text: "Paid to their bank." };
    if (leg.bank_status === "processing" || leg.bank_status === "sending")
      return { good: true, text: "Sent. It is on its way to their bank." };
    return {
      good: false,
      open: true,
      text: "Their money is at Bachs but the bank payout needs a retry.",
    };
  }
  if (leg?.status === "unknown")
    return {
      good: false,
      open: true,
      text: "We could not confirm the transfer. Do not pay again; reconcile it.",
    };
  return { good: false, text: leg?.failure_reason ?? "Nothing was sent." };
}

type StatusFilter = PayoutStatus | "all";

const STATUS_TONE: Record<PayoutStatus, PillTone> = {
  paid: "good",
  processing: "pending",
  pending: "neutral",
};

/**
 * What each contributor is owed, and what has gone out.
 *
 * Money is held in kobo throughout — a
 * payment run that does float arithmetic on naira will eventually be a rounding
 * complaint from someone who was underpaid by a kobo.
 */
export default function AdminPaymentsPage() {
  const [status, setStatus] = useState<StatusFilter>("all");
  /* Two tables, one at a time. They answer different questions — what each
   * contributor is owed, and what has actually gone out — and stacking them
   * made the second one something nobody scrolled to. */
  const [tab, setTab] = useState<Tab>("earnings");
  const {
    rows: earnings,
    isLoading: loadingEarnings,
    error: earningsError,
    reload: reloadEarnings,
  } = useEarnings();

  const isLoading = loadingEarnings;

  const payouts = usePayouts();
  const [runOpen, setRunOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [detail, setDetail] = useState<Earning | null>(null);
  const [openRunId, setOpenRunId] = useState<string | null>(null);
  const openRun = payouts.runs.find((run) => run.id === openRunId) ?? null;

  const rows = earnings;
  const isEmpty = rows.length === 0;
  const metrics = isEmpty ? EMPTY_PAYMENT_METRICS : paymentMetrics(rows);

  /* A leg carries an id, not a name. Everyone a run pays has earnings. */
  const names = useMemo(
    () => new Map(rows.map((row) => [row.id, row.contributor])),
    [rows]
  );

  const filtered = useMemo(
    () => (status === "all" ? rows : rows.filter((row) => row.status === status)),
    [rows, status]
  );


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
            {/* Everything that is not the primary action. Three buttons side
                by side gives equal weight to a pay run and a CSV export,
                which are not equal. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <TextureButton variant="minimal" size="sm" className="w-auto">
                  <MenuDots size={15} weight="Outline" />
                  More
                </TextureButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 rounded-2xl border-alva-border bg-alva-card p-1.5"
              >
                <DropdownMenuItem
                  className="gap-2 rounded-xl"
                  onSelect={() => {
                    downloadCsv("alva-earnings.csv", earningsToCsv(filtered));
                    alvaToast.success(`Exported ${filtered.length} rows`);
                  }}
                >
                  <Upload size={15} weight="Outline" />
                  Export CSV
                </DropdownMenuItem>

                {/* One-off: the 29 Oct rates replaced milestone pay, and
                    this credits the difference on work already approved. */}
                <DropdownMenuItem
                  className="gap-2 rounded-xl"
                  onSelect={() => setSyncOpen(true)}
                >
                  <BillList size={15} weight="Outline" />
                  Back-pay at new rates
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* The only way money moves. A run pays everybody eligible at
                once, which is why it lives here rather than on a row. */}
            <TextureButton
              variant="alva"
              size="sm"
              className="w-auto"
              /* Open even when nobody can be paid: the dialog says why. */
              disabled={!payouts.preview}
              onClick={() => setRunOpen(true)}
            >
              <BillCheck size={15} weight="Outline" />
              Run payment
            </TextureButton>
          </div>
        }
      />

      {earningsError || payouts.error ? (
        <div
          role="alert"
          className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400"
        >
          {earningsError ?? payouts.error}
          <button
            type="button"
            onClick={() => {
              reloadEarnings();
              payouts.reload();
            }}
            className="shrink-0 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            Retry
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <AdminPageSkeleton charts={0} chartColumns={1} table={true} />
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

      <Tabs
        className="mt-3"
        value={tab}
        onValueChange={(value) => setTab(value as Tab)}
      >
        <TabsList className="h-9 rounded-full bg-alva-surface p-1">
          <TabsTrigger
            value="earnings"
            className="rounded-full px-4 text-sm data-[state=active]:bg-alva-card data-[state=active]:text-foreground"
          >
            Earnings
          </TabsTrigger>
          <TabsTrigger
            value="runs"
            className="rounded-full px-4 text-sm data-[state=active]:bg-alva-card data-[state=active]:text-foreground"
          >
            <span className="flex items-center gap-2">
              Payment runs
              {payouts.runs.length > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-alva-card px-1.5 text-[10px] font-semibold text-muted-foreground">
                  {payouts.runs.length}
                </span>
              ) : null}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="mt-2">
        <AlvaDataTable
          title="Earnings"
          rows={filtered}
          columns={columns}
          pageSize={10}
          searchPlaceholder="Search"
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
        </TabsContent>

        {/* Every run already made. Nothing else on the admin surface shows
            these, so a failed leg had nowhere to be noticed. */}
        <TabsContent value="runs" className="mt-2">
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
          <div className="alva-thin-scrollbar max-h-[15rem] space-y-1 overflow-y-auto pr-1">
            {/* A completed run means every transfer landed, not that the
                money reached every bank: each row says how many it reached,
                and the panel shows every leg's bank payout. */}
            {payouts.runs.map((run) => {
              const { atBank, toRetry } = bankSummary(run);
              return (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => setOpenRunId(run.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border-b border-alva-border/50 px-1 py-2 text-left transition-colors last:border-0 hover:bg-alva-surface/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs text-foreground">
                      {run.reference}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {relativeDays(new Date(run.created_at))}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {atBank}/{run.recipient_count} at the bank
                    </span>
                    <span className="text-xs tabular-nums text-foreground">
                      {formatNairaAmount(run.total_amount)}
                    </span>
                    {toRetry > 0 ? (
                      <AdminStatusPill tone="bad">{toRetry} to retry</AdminStatusPill>
                    ) : null}
                    <AdminStatusPill tone={RUN_TONE[run.status]}>
                      {RUN_LABEL[run.status]}
                    </AdminStatusPill>
                  </span>
                </button>
              );
            })}
          </div>
        </AlvaChartCard>
        </TabsContent>
      </Tabs>

      <BackPayDialog
        open={syncOpen}
        onOpenChange={setSyncOpen}
        onDone={reloadEarnings}
      />

      <RunPaymentDialog
        open={runOpen}
        onOpenChange={setRunOpen}
        preview={payouts.preview}
        isRunning={payouts.isRunning}
        payingUserId={payouts.payingUserId}
        onPay={async (recipient) => {
          try {
            const started = await payouts.run({ userId: recipient.user_id, offSchedule: true });
            reloadEarnings();
            const outcome = payOneOutcome(started.items[0]);
            if (outcome.good) alvaToast.success(outcome.text);
            else alvaToast.error(outcome.text);
            /* Retry and reconcile live on the run's panel. */
            if (outcome.open) {
              setRunOpen(false);
              setOpenRunId(started.id);
            }
          } catch (cause) {
            if (cause instanceof ApiError && cause.status === 404) {
              alvaToast.error("That contributor no longer exists.");
              payouts.reload();
              return;
            }
            const message = reportApiError(cause, "Could not pay them.");
            if (message) alvaToast.error(message);
          }
        }}
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
      />

      <PayoutRunPanel
        open={openRun !== null}
        onOpenChange={(next) => !next && setOpenRunId(null)}
        run={openRun}
        names={names}
        onRetryBank={payouts.retryBank}
        onReconcile={payouts.reconcile}
      />
        </>
      )}
    </DesktopPageShell>
  );
}
