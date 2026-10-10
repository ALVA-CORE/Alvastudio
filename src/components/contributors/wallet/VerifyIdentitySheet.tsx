import { useEffect, useState } from "react";
import ShieldCheck from "@solar-icons/react/security/ShieldCheck";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { FieldBeam } from "@/components/shared/FieldBeam";
import { TextureButton } from "@/components/ui/texture-button";
import { alvaFieldClass } from "@/lib/alva-form-styles";
import type { IdentityState } from "@/data/contributors/wallet";
import { cn } from "@/lib/utils";

/** A NIN is eleven digits. Nothing shorter is worth sending. */
const NIN_LENGTH = 11;

/**
 * Verify identity before any money can move.
 *
 * A verified NIN is the only route to being paid: without one there is no
 * payout destination to collect and the contributor is not eligible for a pay
 * run at all. That makes it a gate rather than a setting, so it is the first
 * thing the wallet asks for and the last thing it stops asking for.
 *
 * A bottom sheet, not a page. The task is one field, and taking someone off
 * the dashboard to type eleven digits loses the balance they were looking at,
 * which is the reason they are doing it.
 *
 * The same sheet is reachable from the profile afterwards, because a
 * submission that is still being checked is a thing people come back to look
 * at, and "where did that go" is the question a one-time flow always creates.
 */
export function VerifyIdentitySheet({
  open,
  onOpenChange,
  state,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: IdentityState;
  onSubmit: (nin: string) => void;
}) {
  const [nin, setNin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNin("");
    setSubmitting(false);
  }, [open]);

  const complete = nin.length === NIN_LENGTH;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="rounded-t-[28px] border-alva-border bg-alva-card px-4 pb-8 pt-7"
      >
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="text-xl text-foreground">
            {state === "pending" ? "We're checking your NIN" : "Verify your identity"}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {state === "pending"
              ? "This usually takes a few minutes. You can close this and carry on recording."
              : "We need your National Identity Number before we can pay you. It is checked once, and never shown to anyone else."}
          </p>
        </SheetHeader>

        {state === "pending" ? (
          <div className="mt-6 flex flex-col items-center py-6 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-alva-surface">
              <ShieldCheck size={26} weight="BoldDuotone" className="text-amber-300" />
            </span>
            <p className="mt-3 text-sm font-medium text-foreground">
              Submitted, waiting on a result
            </p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Your earnings keep adding up while we check. Nothing is lost.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="wallet-nin"
                className="mb-1.5 block text-xs text-muted-foreground"
              >
                National Identity Number
              </label>
              <FieldBeam>
                <Input
                  id="wallet-nin"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="11 digits"
                  value={nin}
                  onChange={(event) =>
                    setNin(
                      event.target.value.replace(/\D/g, "").slice(0, NIN_LENGTH)
                    )
                  }
                  className={alvaFieldClass()}
                />
              </FieldBeam>
            </div>

            <p className="text-xs text-muted-foreground">
              Dial <span className="text-foreground">*346#</span> on the phone
              your NIN is registered to if you do not have it written down.
            </p>

            <TextureButton
              variant="alva"
              size="lg"
              className={cn("mt-1")}
              disabled={!complete}
              loading={submitting}
              onClick={() => {
                setSubmitting(true);
                onSubmit(nin);
              }}
            >
              Submit for checking
            </TextureButton>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
