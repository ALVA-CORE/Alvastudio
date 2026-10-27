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
import { AuthCheckbox } from "@/components/auth/AuthCheckbox";
import { SelfieCapture } from "@/components/contributors/wallet/SelfieCapture";
import { TextureButton } from "@/components/ui/texture-button";
import { alvaFieldClass } from "@/lib/alva-form-styles";
import type { IdentityState } from "@/data/contributors/wallet";
import { cn } from "@/lib/utils";
import { alvaToast } from "@/lib/alva-toast";
import { reportApiError } from "@/lib/api/reportApiError";
import { ApiError } from "@/lib/api/client";

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
  onSubmit: (nin: string, consent: boolean, selfie: string) => Promise<void>;
}) {
  const [nin, setNin] = useState("");
  const [consent, setConsent] = useState(false);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [step, setStep] = useState<"details" | "photo">("details");
  const [submitting, setSubmitting] = useState(false);
  /** A refusal that retrying cannot fix, so it replaces the form. */
  const [blocked, setBlocked] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNin("");
    setConsent(false);
    setSelfie(null);
    setStep("details");
    setSubmitting(false);
    setBlocked(null);
  }, [open]);

  // Disabled until consent is checked, regardless of how many digits are in.
  const detailsDone = consent && nin.length === NIN_LENGTH;

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
              : step === "photo"
                ? "Last step. Your face is matched against the photo on your NIN record."
                : /* Said once, plainly, at the top. Somebody can record for
                     weeks without knowing the money cannot move until this
                     is done, and finding out at withdrawal is too late. */
                  "You can record without this, but we can't pay you until it's done."}
          </p>
        </SheetHeader>

        {blocked ? (
          <div className="mt-6 flex flex-col items-center py-4 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-alva-surface">
              <ShieldCheck size={26} weight="BoldDuotone" className="text-destructive" />
            </span>
            <p className="mt-3 text-sm font-medium text-foreground">
              We cannot verify this NIN
            </p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
              {blocked}
            </p>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
              If this is your own NIN, contact support and we will sort it out.
              Nothing you have recorded is lost.
            </p>
          </div>
        ) : state === "pending" ? (
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
            {step === "photo" ? (
              <>
                <SelfieCapture value={selfie} onChange={setSelfie} />

                <div className="flex items-center gap-2">
                  <TextureButton
                    variant="minimal"
                    size="lg"
                    className="w-auto"
                    onClick={() => setStep("details")}
                  >
                    Back
                  </TextureButton>

                  <TextureButton
                    variant="alva"
                    size="lg"
                    disabled={!selfie}
                    loading={submitting}
                    onClick={async () => {
                      if (!selfie) return;
                      setSubmitting(true);
                      try {
                        await onSubmit(nin, consent, selfie);
                      } catch (cause) {
                        /* A 409 is a duplicate: this NIN already belongs to
                           another account, so there is nothing to retype and
                           nothing to try again. It stays on screen rather
                           than in a toast that goes away while they are
                           still reading it. */
                        if (cause instanceof ApiError && cause.status === 409) {
                          setBlocked(cause.message);
                          return;
                        }

                        /* The caller closes the sheet on success, so reaching
                           here means it failed and everything typed is still
                           on screen. Say why rather than letting the rejection
                           escape to the console. */
                        const message = reportApiError(
                          cause,
                          "Could not submit that for checking."
                        );
                        if (message) alvaToast.error(message);
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  >
                    Submit for checking
                  </TextureButton>
                </div>
              </>
            ) : (
            <>
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
              Don’t know your NIN? Dial <span className="text-foreground">*346#</span>
            </p>

            {/* The API requires this and will not accept a submission without
                it. It is a real attestation, so the person ticks it rather
                than us sending `true` on their behalf. */}
            <label className="flex cursor-pointer items-start gap-1.5">
              <AuthCheckbox
                checked={consent}
                onCheckedChange={(value) => setConsent(value === true)}
              />
              <span className="text-xs leading-relaxed text-muted-foreground">
                I agree that Alvastudio can check this number against the
                national identity database to confirm who I am.
              </span>
            </label>

            <TextureButton
              variant="alva"
              size="lg"
              className={cn("mt-1")}
              disabled={!detailsDone}
              onClick={() => setStep("photo")}
            >
              Continue
            </TextureButton>
            </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
