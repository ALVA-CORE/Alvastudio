import { useEffect, useState } from "react";
import Wallet from "@solar-icons/react/money/Wallet";
import CloseCircle from "@solar-icons/react/ui/CloseCircle";
import { AdminStatusPill, type PillTone } from "@/components/admin/shared/AdminStatusPill";
import {
  DetailField,
  DetailGroup,
  DetailPanel,
} from "@/components/admin/shared/detail";
import {
  PAYOUT_STATUS_LABELS,
  formatNaira,
  type Earning,
  type PayoutStatus,
} from "@/data/admin/payments";
import { cn } from "@/lib/utils";
import { useContributorLedger, canVoid } from "@/hooks/useContributorLedger";
import { VoidEarningDialog } from "@/components/admin/payments/VoidEarningDialog";

const STATUS_TONE: Record<PayoutStatus, PillTone> = {
  paid: "good",
  processing: "pending",
  pending: "neutral",
};

/**
 * What one contributor is owed, and where the figure came from.
 *
 * The breakdown matters more than the total: a contributor querying their
 * payment is asking "which of my recordings counted", and a single number
 * cannot answer that.
 */
const TABS = [
  { id: "summary", label: "Summary" },
  { id: "earnings", label: "Earnings" },
];

export function EarningDetailPanel({
  open,
  onOpenChange,
  earning,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  earning: Earning | null;
}) {
  const [tab, setTab] = useState("summary");
  const [voiding, setVoiding] = useState<{
    id: string;
    label: string;
    amountKobo: number;
  } | null>(null);

  /* Only once the tab is opened. An admin scrolling four hundred rows does
     not need four hundred ledgers, and most of them open this panel to read
     a total rather than to audit a line of it. */
  const ledger = useContributorLedger(
    earning?.id,
    open && Boolean(earning) && tab === "earnings"
  );

  /* Back to the summary on a new person: the open tab belongs to the panel,
     not to the row, and landing on somebody's ledger because the last panel
     was left there is disorienting. */
  useEffect(() => {
    setTab("summary");
  }, [earning?.id]);

  if (!earning) return null;


  return (
    <>
      <DetailPanel
        open={open}
        onOpenChange={onOpenChange}
        title={`Earnings for ${earning.contributor}`}
        tabs={TABS}
        activeTab={tab}
        onTabChange={setTab}
        header={
          <div className="flex flex-col items-center text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-alva-surface">
              <Wallet size={26} weight="BoldDuotone" className="text-alva-accent" />
            </span>
            <p className="mt-4 text-xl font-semibold text-foreground">
              {earning.contributor}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-alva-accent">
              {formatNaira(earning.earnedKobo)}
            </p>
            <div className="mt-2">
              <AdminStatusPill tone={STATUS_TONE[earning.status]}>
                {PAYOUT_STATUS_LABELS[earning.status]}
              </AdminStatusPill>
            </div>
          </div>
        }
        footer={
          earning.status === "paid" ? (
            <p className="px-1 text-xs text-muted-foreground">
              Settled in full — {formatNaira(earning.paidKobo)}.
            </p>
          ) : null
        }
      >
        {tab === "earnings" ? (
          <EarningsTimeline ledger={ledger} onVoid={setVoiding} />
        ) : (
        <>
        <DetailGroup title="Work counted" first>
          <DetailField label="Recordings" value={String(earning.recordings)} />
          <DetailField label="Minutes" value={String(earning.minutes)} />
          <DetailField label="Last active" value={earning.lastActivityLabel} />
          <DetailField
            label="Status"
            value={PAYOUT_STATUS_LABELS[earning.status]}
            tone={earning.status === "paid" ? "accent" : "default"}
          />
        </DetailGroup>

        <DetailGroup title="Settlement">
          <DetailField label="Earned" value={formatNaira(earning.earnedKobo)} />
          <DetailField
            label="Paid"
            value={formatNaira(earning.paidKobo)}
            tone={earning.paidKobo > 0 ? "accent" : "muted"}
          />
          <DetailField
            label="Outstanding"
            value={formatNaira(earning.earnedKobo - earning.paidKobo)}
            tone={earning.earnedKobo > earning.paidKobo ? "danger" : "muted"}
            span
          />
        </DetailGroup>
        </>
        )}
      </DetailPanel>

      <VoidEarningDialog
        open={voiding !== null}
        onOpenChange={(next) => !next && setVoiding(null)}
        entry={voiding}
        onVoided={ledger.reload}
      />

    </>
  );
}

/**
 * Their ledger, newest first.
 *
 * A timeline rather than a list of rows, for the same reason the audit log
 * is one: these are events in order, and the question an admin brings here
 * is "what happened, and when did it stop being right". A table of amounts
 * answers the first half.
 *
 * The dot carries the state, so a voided entry is findable without reading
 * every line: accent for money waiting, grey for money gone or cancelled.
 * A voided row keeps its place and its amount struck through, because it is
 * the audit record — deleting it would answer "why is this person owed less
 * than they think" with silence.
 */
function EarningsTimeline({
  ledger,
  onVoid,
}: {
  ledger: ReturnType<typeof useContributorLedger>;
  onVoid: (entry: { id: string; label: string; amountKobo: number }) => void;
}) {
  if (ledger.error) {
    return (
      <p role="alert" className="py-10 text-center text-sm text-red-400">
        {ledger.error}
      </p>
    );
  }

  if (ledger.isLoading && ledger.entries.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Reading their ledger…
      </p>
    );
  }

  if (ledger.entries.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nothing has been credited to them yet.
      </p>
    );
  }

  return (
    <ol className="relative pt-1">
      {ledger.entries.map((entry, index) => {
        const kobo = Math.round(Number(entry.amount) * 100);
        const voided = entry.payout_status === "voided";
        const label =
          entry.notes ?? (entry.unit_type ?? "Earned").replace(/_/g, " ");

        return (
          <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
            {/* The rail stops at the last dot rather than running past it —
                a line trailing into space implies more below. */}
            {index < ledger.entries.length - 1 ? (
              <span
                aria-hidden
                className="absolute left-[3.5px] top-3 h-full w-px bg-alva-border"
              />
            ) : null}

            <span
              aria-hidden
              className={cn(
                "relative mt-1.5 size-2 shrink-0 rounded-full",
                voided
                  ? "bg-red-400/60"
                  : entry.payout_status === "paid"
                    ? "bg-muted-foreground"
                    : "bg-alva-accent"
              )}
            />

            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatLedgerDate(entry.created_at)} ·{" "}
                  {PAYOUT_STATUS_LABELS[entry.payout_status] ?? entry.payout_status}
                </p>
              </div>

              <span
                className={cn(
                  "shrink-0 text-sm tabular-nums",
                  voided ? "text-muted-foreground line-through" : "text-foreground"
                )}
              >
                {formatNaira(kobo)}
              </span>

              {canVoid(entry) ? (
                <button
                  type="button"
                  aria-label={`Void ${label}`}
                  onClick={() => onVoid({ id: entry.id, label, amountKobo: kobo })}
                  className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-alva-surface hover:text-red-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
                >
                  <CloseCircle size={15} weight="Outline" />
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Date and clock time: two credits on one day are otherwise one blur. */
function formatLedgerDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
