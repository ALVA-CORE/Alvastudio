import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FieldBeam } from "@/components/shared/FieldBeam";
import { TextureButton } from "@/components/ui/texture-button";
import { alvaFieldClass } from "@/lib/alva-form-styles";
import { voidLedgerEntry } from "@/lib/api/payouts";
import { reportApiError } from "@/lib/api/reportApiError";
import { formatWalletNaira } from "@/data/contributors/wallet";
import { alvaToast } from "@/lib/alva-toast";

/** The API's own bounds, so a refusal never costs a round trip. */
const MIN_REASON = 3;
const MAX_REASON = 500;

/**
 * Cancels one earning, with a reason.
 *
 * **Nothing is deleted.** The entry stays in the ledger marked voided, with
 * this reason on its notes, because the question somebody asks three months
 * later is not "how much is owed" but "why is this person owed less than
 * they think". That is also why the reason is required rather than
 * optional: a void with no explanation is an unexplained reduction in
 * somebody's pay.
 *
 * Only offered on an entry that has not gone anywhere. Paid and in-flight
 * money has left, and voiding it would make the ledger disagree with the
 * bank rather than correct it.
 */
export function VoidEarningDialog({
  open,
  onOpenChange,
  entry,
  onVoided,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: { id: string; label: string; amountKobo: number } | null;
  onVoided: () => void;
}) {
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = reason.trim().length < MIN_REASON;

  const submit = async () => {
    if (!entry || tooShort) return;
    setWorking(true);
    setError(null);

    try {
      await voidLedgerEntry(entry.id, reason.trim());
      alvaToast.success(`${formatWalletNaira(entry.amountKobo)} voided`);
      setReason("");
      onVoided();
      onOpenChange(false);
    } catch (cause) {
      setError(reportApiError(cause, "Could not void that earning."));
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-alva-border bg-alva-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Void this earning?</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {entry
              ? `${formatWalletNaira(entry.amountKobo)} for ${entry.label}. It stays in the ledger, marked voided, so the reason is on the record.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </p>
        ) : null}

        <div>
          <label htmlFor="void-reason" className="mb-1.5 block text-xs text-muted-foreground">
            Why
          </label>
          <FieldBeam>
            <Input
              id="void-reason"
              autoFocus
              maxLength={MAX_REASON}
              placeholder="Duplicate upload of the same clip"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={alvaFieldClass()}
            />
          </FieldBeam>
          {/* The contributor is not shown this, but the next admin is, and so
              is anybody auditing the ledger a year from now. */}
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Recorded on the entry. Write it for whoever reads this later.
          </p>
        </div>

        <div className="flex gap-2">
          <TextureButton
            variant="alva"
            size="sm"
            className="w-auto"
            disabled={tooShort}
            loading={working}
            onClick={() => void submit()}
          >
            Void earning
          </TextureButton>
          <TextureButton
            variant="minimal"
            size="sm"
            className="w-auto"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </TextureButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
