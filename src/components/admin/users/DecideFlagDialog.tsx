import { useEffect, useState } from "react";
import UserBlock from "@solar-icons/react/users/UserBlock";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
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
import { formatWalletNaira } from "@/data/contributors/wallet";
import type { ApiDuplicateFlag } from "@/lib/api/payouts";
import { alvaToast } from "@/lib/alva-toast";

type Decision = {
  flag: ApiDuplicateFlag & { who: string; matched: string; kindLabel: string };
  uphold: boolean;
};

/**
 * Deciding a duplicate flag.
 *
 * Two outcomes that are not two shades of the same thing, so they do not
 * share a confirm. Dismissing takes a hold off and both people carry on.
 * **Upholding closes every account the flag names, the first one included**
 * — deactivated, tokens dead, wallets blocked, every unsent earning voided
 * — and payments already on their way cannot be called back.
 *
 * **It warns in words rather than figures, and that is a compromise.**
 * `voided_amount_kobo` and `in_flight_entries` only exist *after* the
 * resolve, so there is no number to show beforehand. We have asked for a
 * preview; until it lands, the honest thing is to name both accounts, say
 * plainly what will happen to them, and report the real cost the moment it
 * is known. It is listed in `docs/backend/endpoints-needed.md`.
 *
 * A note is required on both. The next admin reading this flag should find
 * a reason rather than guess at one, and that is as true of "these are
 * twins" as it is of a closure.
 */
export function DecideFlagDialog({
  open,
  onOpenChange,
  decision,
  isWorking,
  onDecide,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decision: Decision | null;
  isWorking: boolean;
  onDecide: (
    flagId: string,
    uphold: boolean,
    notes: string
  ) => Promise<ApiDuplicateFlag | null>;
  onDone: () => void;
}) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) setNotes("");
  }, [open, decision?.flag.id]);

  if (!decision) return null;

  const { flag, uphold } = decision;
  const tooShort = notes.trim().length < 3;

  const submit = async () => {
    const result = await onDecide(flag.id, uphold, notes.trim());
    if (!result) return;

    onOpenChange(false);
    onDone();

    if (!uphold) {
      alvaToast.success("Flag cleared, their payouts are released");
      return;
    }

    /* The real cost, reported the moment it exists. Before the resolve
       there is no number to show — see the ask in endpoints-needed.md. */
    const closed = result.closed_user_ids?.length ?? 0;
    const voided = result.voided_amount_kobo ?? 0;
    const inFlight = result.in_flight_entries ?? 0;

    alvaToast.error(
      `${closed || 2} ${closed === 1 ? "account" : "accounts"} closed, ` +
        `${formatWalletNaira(voided)} voided` +
        (inFlight > 0
          ? `. ${inFlight} ${inFlight === 1 ? "payment was" : "payments were"} already on the way and could not be stopped.`
          : ".")
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-alva-border bg-alva-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {uphold ? (
              <UserBlock size={18} weight="Outline" className="text-destructive" />
            ) : (
              <CheckCircle size={18} weight="Outline" className="text-alva-accent" />
            )}
            {uphold ? "Close both accounts?" : "Not a duplicate?"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {uphold
              ? "They keep nothing and cannot sign in again."
              : "The hold comes off and both accounts carry on as normal."}
          </DialogDescription>
        </DialogHeader>

        {/* Named, both of them. An admin closing two accounts should be
            reading who, not a flag id. */}
        <div className="rounded-xl bg-alva-surface px-3.5 py-3">
          <p className="text-xs text-muted-foreground">
            Flagged for: <span className="text-foreground">{flag.kindLabel}</span>
          </p>
          <ul className="mt-2 space-y-1">
            <li className="text-sm text-foreground">{flag.who}</li>
            <li className="text-sm text-foreground">{flag.matched}</li>
          </ul>
        </div>

        {uphold ? (
          <ul className="space-y-1 rounded-xl bg-red-500/10 px-3.5 py-3 text-xs leading-relaxed text-red-400">
            <li>Both accounts are turned off and their sign-ins stop working.</li>
            <li>Both wallets are blocked and every unpaid earning is voided.</li>
            <li>Any payment already on its way cannot be called back.</li>
          </ul>
        ) : null}

        <div>
          <label htmlFor="flag-notes" className="mb-1.5 block text-xs text-muted-foreground">
            Why
          </label>
          <FieldBeam>
            <Input
              id="flag-notes"
              autoFocus
              maxLength={500}
              placeholder={
                uphold ? "Same person, two accounts" : "Siblings on one device"
              }
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={alvaFieldClass()}
            />
          </FieldBeam>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Recorded on the flag. The next admin reads this instead of guessing.
          </p>
        </div>

        <div className="flex gap-2">
          <TextureButton
            variant="alva"
            size="sm"
            className="w-auto"
            disabled={tooShort}
            loading={isWorking}
            onClick={() => void submit()}
          >
            {uphold ? "Close both accounts" : "Clear the flag"}
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
