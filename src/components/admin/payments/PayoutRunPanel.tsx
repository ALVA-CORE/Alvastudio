import { useState } from "react";
import BillCheck from "@solar-icons/react/money/BillCheck";
import { DetailPanel } from "@/components/admin/shared/detail";
import { AdminStatusPill, type PillTone } from "@/components/admin/shared/AdminStatusPill";
import { TextureButton } from "@/components/ui/texture-button";
import { RUN_LABEL, RUN_TONE, bankSummary, formatNairaAmount } from "@/data/admin/payments";
import { relativeDays } from "@/data/admin/shared";
import {
  canRetryBank,
  type ApiBankPayoutStatus,
  type ApiPayoutRun,
  type ApiPayoutRunItem,
} from "@/lib/api/payouts";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";

/** Our transfer, into their Bachs balance. */
const TRANSFER: Record<ApiPayoutRunItem["status"], { label: string; tone: PillTone }> = {
  pending: { label: "Waiting", tone: "neutral" },
  sending: { label: "Sending", tone: "pending" },
  transferred: { label: "Transferred", tone: "good" },
  failed: { label: "Transfer failed", tone: "bad" },
  skipped: { label: "Skipped", tone: "neutral" },
  unknown: { label: "Transfer unknown", tone: "pending" },
};

/** Their Bachs balance, on to their bank. */
const BANK: Record<ApiBankPayoutStatus, { label: string; tone: PillTone }> = {
  sending: { label: "Sending to bank", tone: "pending" },
  processing: { label: "On its way to bank", tone: "pending" },
  paid: { label: "At the bank", tone: "good" },
  failed: { label: "Bank payout failed", tone: "bad" },
  unknown: { label: "Bank outcome unknown", tone: "pending" },
};

/**
 * One run, leg by leg.
 *
 * Each leg has two steps since 13 Nov: our transfer into the contributor's
 * Bachs balance, then Bachs paying that on to their bank. A completed run
 * says only that every transfer landed, so both steps are shown, and a bank
 * payout that failed, was lost, or was never asked for can be retried here.
 */
export function PayoutRunPanel({
  open,
  onOpenChange,
  run,
  names,
  onRetryBank,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: ApiPayoutRun | null;
  /** Contributor names by id, from the earnings already on the page. */
  names: Map<string, string>;
  onRetryBank: (runId: string, itemId: string) => Promise<ApiPayoutRunItem>;
}) {
  const [retrying, setRetrying] = useState<string | null>(null);

  if (!run) return null;

  const { atBank } = bankSummary(run);

  const retry = async (item: ApiPayoutRunItem) => {
    setRetrying(item.id);
    try {
      const leg = await onRetryBank(run.id, item.id);
      const now = leg.bank_status ? BANK[leg.bank_status].label : "No bank payout";
      alvaToast.show(now, { variant: "default" });
    } catch (cause) {
      /* A 409 is a sentence to show as it is: already paid, still being
         sent, or the bank account not approved yet. */
      const message = reportApiError(cause, "Could not retry that payout.");
      if (message) alvaToast.error(message);
    } finally {
      setRetrying(null);
    }
  };

  return (
    <DetailPanel
      open={open}
      onOpenChange={onOpenChange}
      title={`Payment run ${run.reference}`}
      header={
        <div className="flex flex-col items-center pb-5 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-alva-surface">
            <BillCheck size={26} weight="BoldDuotone" className="text-alva-accent" />
          </span>
          <p className="mt-4 text-base font-semibold text-foreground">{run.reference}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-alva-accent">
            {formatNairaAmount(run.total_amount)}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <AdminStatusPill tone={RUN_TONE[run.status]}>{RUN_LABEL[run.status]}</AdminStatusPill>
            <span className="text-xs tabular-nums text-muted-foreground">
              {atBank}/{run.recipient_count} at the bank · {relativeDays(new Date(run.created_at))}
            </span>
          </div>
        </div>
      }
    >
      <ul className="space-y-2">
        {run.items.map((item) => {
          const transfer = TRANSFER[item.status];
          const bank = item.bank_status ? BANK[item.bank_status] : null;
          const reason = item.bank_failure_reason ?? item.failure_reason;
          const fee = formatNairaAmount(item.bank_fee);
          const name = item.user_id
            ? (names.get(item.user_id) ?? item.user_id.slice(0, 8))
            : "Deleted account";

          return (
            <li key={item.id} className="rounded-2xl bg-alva-surface px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{name}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    {formatNairaAmount(item.amount)}
                    {fee ? ` · fee ${fee}` : ""}
                    {item.bank_attempts > 1 ? ` · ${item.bank_attempts} bank attempts` : ""}
                    {item.bank_settled_at
                      ? ` · arrived ${relativeDays(new Date(item.bank_settled_at)).toLowerCase()}`
                      : ""}
                  </p>
                </div>

                {canRetryBank(item) ? (
                  <TextureButton
                    variant="minimal"
                    size="sm"
                    className="w-auto shrink-0"
                    loading={retrying === item.id}
                    disabled={retrying !== null && retrying !== item.id}
                    onClick={() => void retry(item)}
                  >
                    {item.bank_status === null ? "Send to bank" : "Retry"}
                  </TextureButton>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <AdminStatusPill tone={transfer.tone}>{transfer.label}</AdminStatusPill>
                {bank ? <AdminStatusPill tone={bank.tone}>{bank.label}</AdminStatusPill> : null}
              </div>

              {reason ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{reason}</p>
              ) : null}

              {item.bank_reference ? (
                <p className="mt-1 truncate text-[11px] tabular-nums text-muted-foreground/70">
                  {item.bank_reference}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </DetailPanel>
  );
}
