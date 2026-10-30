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
import {
  getDuplicateFlag,
  type ApiDuplicateFlag,
  type ApiUpholdPreview,
} from "@/lib/api/payouts";
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
 * **It shows the cost before the decision, not after.** `if_upheld` on
 * `GET /payouts/duplicate-flags/{id}` runs the same calculation the uphold
 * runs and changes nothing, so the admin reads the real amount and then
 * chooses. It used to warn in words and report figures afterwards, which is
 * a receipt rather than a choice.
 *
 * Read when this opens, not with the list: the figures are what the uphold
 * would do *at that moment*, and money moves. The words stay as a fallback
 * for a preview that will not load — a confirm with no warning at all would
 * be worse than one with no numbers.
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
  const [preview, setPreview] = useState<ApiUpholdPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (open) setNotes("");
  }, [open, decision?.flag.id]);

  /* Only for an uphold, and only once the dialog is open. Dismissing
     destroys nothing, so there is nothing to price. */
  useEffect(() => {
    if (!open || !decision?.uphold) {
      setPreview(null);
      return;
    }

    let cancelled = false;
    setLoadingPreview(true);

    getDuplicateFlag(decision.flag.id)
      .then((flag) => {
        if (!cancelled) setPreview(flag.if_upheld ?? null);
      })
      .catch(() => {
        /* The worded warning below still stands. A confirm that will not
           open because a figure could not be fetched is worse than one
           without the figure. */
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, decision?.uphold, decision?.flag.id]);

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
    const inFlight = result.in_flight_kobo ?? 0;

    alvaToast.error(
      `${closed || 2} ${closed === 1 ? "account" : "accounts"} closed, ` +
        `${formatWalletNaira(voided)} voided` +
        (inFlight > 0
          ? `. ${formatWalletNaira(inFlight)} was already on its way and could not be stopped.`
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

        {/* Named, both of them, with what each one loses. An admin closing
            two accounts should be reading who and how much, not a flag id. */}
        <div className="rounded-xl bg-alva-surface px-3.5 py-3">
          <p className="text-xs text-muted-foreground">
            Flagged for: <span className="text-foreground">{flag.kindLabel}</span>
          </p>

          <ul className="mt-2 space-y-1.5">
            {preview
              ? preview.accounts.map((account) => (
                  <li key={account.user_id} className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {account.full_name}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatWalletNaira(account.unpaid_kobo)} unpaid
                    </span>
                  </li>
                ))
              : [flag.who, flag.matched].map((name) => (
                  <li key={name} className="text-sm text-foreground">
                    {name}
                  </li>
                ))}
          </ul>
        </div>

        {uphold ? (
          <div className="space-y-2 rounded-xl bg-red-500/10 px-3.5 py-3 text-xs leading-relaxed text-red-400">
            {/* The figure first, in one sentence, because it is the thing
                being decided. The list under it says what else happens. */}
            {preview ? (
              <p className="text-sm font-medium">
                Closes {preview.accounts.length}{" "}
                {preview.accounts.length === 1 ? "account" : "accounts"} and voids{" "}
                {formatWalletNaira(preview.voided_amount_kobo)}.
                {preview.in_flight_kobo > 0
                  ? ` ${formatWalletNaira(preview.in_flight_kobo)} more is already on its way and cannot be called back.`
                  : ""}
              </p>
            ) : loadingPreview ? (
              <p className="text-sm font-medium">Working out what this costs…</p>
            ) : null}

            <ul className="space-y-1">
              <li>Both accounts are turned off and their sign-ins stop working.</li>
              <li>Both wallets are blocked and every unpaid earning is voided.</li>
              {preview?.in_flight_kobo ? null : (
                <li>Any payment already on its way cannot be called back.</li>
              )}
            </ul>
          </div>
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
