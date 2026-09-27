import { useState } from "react";
import Wallet from "@solar-icons/react/money/Wallet";
import BillCheck from "@solar-icons/react/money/BillCheck";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AdminStatusPill, type PillTone } from "@/components/admin/shared/AdminStatusPill";
import {
  DetailField,
  DetailGroup,
  DetailPanel,
  PanelAction,
} from "@/components/admin/shared/detail";
import {
  PAYOUT_STATUS_LABELS,
  RATES,
  RATE_UNIT_LABELS,
  formatNaira,
  type Earning,
  type PayoutStatus,
} from "@/data/admin/payments";

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
 * cannot answer that. Rates are shown as they stand today, which is also the
 * fastest way to spot that someone was paid under an older one.
 */
export function EarningDetailPanel({
  open,
  onOpenChange,
  earning,
  onAdvance,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  earning: Earning | null;
  onAdvance: (earning: Earning) => void;
}) {
  const [confirm, setConfirm] = useState(false);

  if (!earning) return null;

  const perRecording = RATES.find((rate) => rate.unit === "prompt_read");
  const perMinute = RATES.find((rate) => rate.unit === "focus_group_minute");

  const nextStep = earning.status === "pending" ? "Queue for payment" : "Mark as paid";

  return (
    <>
      <DetailPanel
        open={open}
        onOpenChange={onOpenChange}
        title={`Earnings for ${earning.contributor}`}
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
          ) : (
            <PanelAction
              icon={<BillCheck size={15} weight="Outline" />}
              label={nextStep}
              tone="primary"
              onClick={() => setConfirm(true)}
            />
          )
        }
      >
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

        <DetailGroup title="Rates applied">
          <DetailField
            label={RATE_UNIT_LABELS.prompt_read}
            value={perRecording ? formatNaira(perRecording.amountKobo) : "—"}
          />
          <DetailField
            label={RATE_UNIT_LABELS.focus_group_minute}
            value={perMinute ? formatNaira(perMinute.amountKobo) : "—"}
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
      </DetailPanel>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        tone="default"
        title={`${nextStep}?`}
        description={
          earning.status === "pending"
            ? `${earning.contributor} moves to processing. Nothing leaves the account until finance confirms the transfer.`
            : `${earning.contributor} is recorded as paid in full. This is what the ledger will show.`
        }
        detail={
          <span className="tabular-nums">
            <span className="text-foreground">{formatNaira(earning.earnedKobo)}</span>{" "}
            to {earning.contributor}
          </span>
        }
        confirmLabel={nextStep}
        onConfirm={() => {
          onAdvance(earning);
          setConfirm(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
