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
import { DocumentCapture } from "@/components/contributors/wallet/DocumentCapture";
import { TextureButton } from "@/components/ui/texture-button";
import { alvaFieldClass } from "@/lib/alva-form-styles";
import type { IdentityState, WalletNextAction } from "@/data/contributors/wallet";
import { mismatchReason, type EncodedDocument } from "@/lib/identity/document";
import { getIdentityMethods } from "@/lib/api/wallet";
import { cn } from "@/lib/utils";
import { alvaToast } from "@/lib/alva-toast";
import { reportApiError } from "@/lib/api/reportApiError";
import { ApiError } from "@/lib/api/client";

/** A NIN is eleven digits. Nothing shorter is worth sending. */
const NIN_LENGTH = 11;

const MIN_AGE = 18;
const MAX_AGE = 120;

/**
 * Which step owns each field the API can complain about.
 *
 * A 422 arrives while the document step is on screen, but four of the six
 * fields it can be about are on the step before. Showing "must be 11 digits"
 * next to a photo of an ID is how somebody retakes the photo three times.
 */
const DETAIL_FIELDS = new Set([
  "nin",
  "consent",
  "first_name",
  "last_name",
  "dob",
]);

/** `YYYY-MM-DD` for a birthday exactly `years` ago, for the picker's bounds. */
function birthdayBound(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().slice(0, 10);
}

export type IdentitySubmission = {
  nin: string;
  consent: boolean;
  firstName: string;
  lastName: string;
  dob: string;
  front: EncodedDocument;
  back: EncodedDocument | null;
};

/**
 * Verify identity before any money can move.
 *
 * Identity is the only route to being paid: without it there is no payout
 * destination to collect and the contributor is not eligible for a pay run at
 * all. That makes it a gate rather than a setting, so it is the first thing
 * the wallet asks for and the last thing it stops asking for.
 *
 * **This is document review, not a face match.** It used to be a NIN and a
 * selfie checked against the government photo, which came back in minutes.
 * That endpoint is gone. A person now reads the document, so the wait is
 * longer and the honest word afterwards is "submitted" — never "verified",
 * which this screen is careful never to say on its own.
 *
 * Two steps, because the alternative is one sheet holding six fields and two
 * file pickers on a phone. Details first, document second, and the document
 * step is where the irreversible thing happens.
 *
 * A bottom sheet, not a page. Taking someone off the dashboard loses the
 * balance they were looking at, which is the reason they are doing this at
 * all. The same sheet is reachable from the profile afterwards, because a
 * submission still under review is a thing people come back to look at.
 */
export function VerifyIdentitySheet({
  open,
  onOpenChange,
  state,
  nextAction,
  detail,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: IdentityState;
  /** What the API says to do next. `await_review` has no form at all. */
  nextAction: WalletNextAction | null;
  /** The API's own sentence about where this stands. Shown as sent. */
  detail?: string | null;
  onSubmit: (submission: IdentitySubmission) => Promise<void>;
}) {
  const [nin, setNin] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [consent, setConsent] = useState(false);
  const [front, setFront] = useState<EncodedDocument | null>(null);
  const [back, setBack] = useState<EncodedDocument | null>(null);
  const [step, setStep] = useState<"details" | "document">("details");
  const [submitting, setSubmitting] = useState(false);
  /** A refusal that retrying cannot fix, so it replaces the form. */
  const [blocked, setBlocked] = useState<string | null>(null);
  /** What the API said was wrong with what was typed. Cleared on each try. */
  const [invalid, setInvalid] = useState<string[]>([]);
  /** Null while unknown. False only when the API says so. */
  const [available, setAvailable] = useState<boolean | null>(null);

  /**
   * Everything typed is dropped the moment the sheet closes.
   *
   * A NIN and a photograph of an ID are the two things in this product that
   * must not outlive the request carrying them. There is no draft, no
   * `localStorage`, and nothing survives a close — not as a convenience
   * traded away, but because the convenience is not ours to offer.
   */
  useEffect(() => {
    if (open) return;
    setNin("");
    setFirstName("");
    setLastName("");
    setDob("");
    setConsent(false);
    setFront(null);
    setBack(null);
    setStep("details");
    setSubmitting(false);
    setBlocked(null);
    setInvalid([]);
  }, [open]);

  /* Asked once per opening, and only to avoid handing somebody a form that
     cannot be submitted. A probe that does not answer is not a reason to
     block anyone, so failure means "assume it works". */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    getIdentityMethods()
      .then((methods) => {
        if (!cancelled) setAvailable(methods.document_available);
      })
      .catch(() => {
        if (!cancelled) setAvailable(true);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const pending = state === "pending" || nextAction === "await_verification";
  const underReview = state === "blocked" || nextAction === "await_review";

  const detailsDone =
    consent &&
    nin.length === NIN_LENGTH &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    dob.length === 10;

  const sidesMismatch = front ? mismatchReason(front, back) : null;

  const submit = async () => {
    if (!front || sidesMismatch) return;
    setSubmitting(true);
    setInvalid([]);

    try {
      await onSubmit({
        nin,
        consent,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob,
        front,
        back,
      });
    } catch (cause) {
      if (cause instanceof ApiError) {
        /* 409 is a wall, not an error: a review already running, a NIN that
           is verified and immutable, or a duplicate that needs an admin.
           None of the three has anything to retype, so the form goes away
           rather than inviting another go at it. */
        if (cause.status === 409) {
          setBlocked(cause.message);
          return;
        }

        /* 410 means the flow changed under us again. Saying "try again"
           would be a lie, and this one needs to reach us, not them. */
        if (cause.status === 410) {
          setBlocked(
            "This way of verifying is no longer in use. Contact support and we will sort it out."
          );
          return;
        }

        /* 502 is the worst case to get wrong: the provider may well have the
           document even though its answer was lost. Offering a retry would
           risk a duplicate submission, so it stops here and the refreshed
           wallet decides what happens next. */
        if (cause.status === 502) {
          setBlocked(
            `${cause.message} We are checking whether it went through — reopen this in a moment to see where it stands.`
          );
          return;
        }

        if (cause.status === 503) {
          setBlocked(cause.message);
          return;
        }

        /* Something typed is wrong. Taken back to the step that owns it
           rather than announced over the step they happen to be on. */
        if (cause.status === 422 && cause.fieldErrors.length > 0) {
          setInvalid(cause.fieldErrors.map((field) => field.message));
          if (cause.fieldErrors.some((field) => DETAIL_FIELDS.has(field.field))) {
            setStep("details");
          }
          return;
        }
      }

      /* The caller closes the sheet on success, so reaching here means it
         failed and everything is still on screen. Say why rather than
         letting the rejection escape to the console. */
      const message = reportApiError(cause, "Could not submit that for review.");
      if (message) alvaToast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const title = underReview
    ? "Your details are being reviewed"
    : pending
      ? "We're reviewing your ID"
      : step === "document"
        ? "Add your ID"
        : "Verify your identity";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="max-h-[92dvh] overflow-y-auto rounded-t-[28px] border-alva-border bg-alva-card px-4 pb-8 pt-7"
      >
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="text-xl text-foreground">{title}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {underReview || pending
              ? "You can close this and carry on recording."
              : step === "document"
                ? "A clear photo of your NIN slip or card. Someone reads it, so the details have to be legible."
                : /* Said once, plainly, at the top. Somebody can record for
                     weeks without knowing the money cannot move until this
                     is done, and finding out at withdrawal is too late. */
                  "You can record without this, but we can't pay you until it's done."}
          </p>
        </SheetHeader>

        {blocked ? (
          <Notice tone="bad" heading="We cannot take this submission" body={blocked}>
            Nothing you have recorded is lost. If this is your own ID, contact
            support and we will sort it out.
          </Notice>
        ) : underReview ? (
          /* No form and no retry button. The API is explicit that a review at
             this stage is a person's decision, and a second submission does
             not reach them any faster. */
          <Notice
            tone="warn"
            heading="Someone is looking at this"
            body={detail ?? "We will let you know as soon as there is an answer."}
          >
            Your earnings keep adding up in the meantime.
          </Notice>
        ) : pending ? (
          <Notice
            tone="warn"
            heading="Submitted, waiting on a result"
            body={detail ?? "A person reviews this, so it can take a little longer than a machine would."}
          >
            Your earnings keep adding up while we check. Nothing is lost.
          </Notice>
        ) : available === false ? (
          <Notice
            tone="warn"
            heading="Not available right now"
            body="We cannot take ID documents at the moment. Try again later — nothing you have recorded is affected."
          />
        ) : (
          <div className="mt-5 space-y-4">
            {invalid.length > 0 ? (
              <ul role="alert" className="space-y-1 rounded-xl bg-red-500/10 p-3">
                {invalid.map((message) => (
                  <li key={message} className="text-xs leading-relaxed text-red-400">
                    {message}
                  </li>
                ))}
              </ul>
            ) : null}

            {state === "failed" && detail ? (
              /* The reason the last attempt failed, kept above the form they
                 are about to fill in again. Sending somebody round the same
                 loop with no idea what went wrong is how an ID gets rejected
                 three times for the same crop. */
              <p className="rounded-xl bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-300">
                {detail}
              </p>
            ) : null}

            {step === "document" ? (
              <>
                <DocumentCapture
                  value={front}
                  onChange={setFront}
                  label="Front of your ID"
                  hint="Photo or PDF. All four corners in frame, no glare."
                  testId="identity-document-front"
                />

                <DocumentCapture
                  value={back}
                  onChange={setBack}
                  label="Back of your ID (optional)"
                  hint="Only if your card has something on the back."
                  testId="identity-document-back"
                />

                {sidesMismatch ? (
                  <p role="alert" className="text-xs text-destructive">
                    {sidesMismatch}
                  </p>
                ) : null}

                <div className="flex items-center gap-2">
                  <TextureButton
                    variant="minimal"
                    size="lg"
                    className="w-auto"
                    disabled={submitting}
                    onClick={() => setStep("details")}
                  >
                    Back
                  </TextureButton>

                  <TextureButton
                    variant="alva"
                    size="lg"
                    disabled={!front || Boolean(sidesMismatch)}
                    loading={submitting}
                    onClick={() => void submit()}
                  >
                    Submit for review
                  </TextureButton>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <Field
                    id="identity-first-name"
                    label="First name"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={setFirstName}
                    maxLength={128}
                  />
                  <Field
                    id="identity-last-name"
                    label="Last name"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={setLastName}
                    maxLength={128}
                  />
                </div>

                <p className="-mt-1.5 text-[11px] text-muted-foreground">
                  Exactly as they appear on your ID.
                </p>

                <div>
                  <label
                    htmlFor="identity-dob"
                    className="mb-1.5 block text-xs text-muted-foreground"
                  >
                    Date of birth
                  </label>
                  <FieldBeam>
                    <Input
                      id="identity-dob"
                      type="date"
                      /* Bounded rather than validated after the fact: the
                         API refuses under 18, and a picker that cannot
                         reach an invalid date says so without an error. */
                      min={birthdayBound(MAX_AGE)}
                      max={birthdayBound(MIN_AGE)}
                      value={dob}
                      onChange={(event) => setDob(event.target.value)}
                      className={cn(alvaFieldClass(), "[&::-webkit-calendar-picker-indicator]:invert")}
                    />
                  </FieldBeam>
                </div>

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
                        setNin(event.target.value.replace(/\D/g, "").slice(0, NIN_LENGTH))
                      }
                      className={alvaFieldClass()}
                    />
                  </FieldBeam>
                </div>

                <p className="text-xs text-muted-foreground">
                  Don’t know your NIN? Dial <span className="text-foreground">*346#</span>
                </p>

                {/* The API requires this and will not accept a submission
                    without it. It is a real attestation, so the person ticks
                    it rather than us sending `true` on their behalf. */}
                <label className="flex cursor-pointer items-start gap-1.5">
                  <AuthCheckbox
                    checked={consent}
                    onCheckedChange={(value) => setConsent(value === true)}
                  />
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    I agree that Alvastudio can review the ID document I upload
                    to confirm who I am.
                  </span>
                </label>

                <TextureButton
                  variant="alva"
                  size="lg"
                  className={cn("mt-1")}
                  disabled={!detailsDone}
                  onClick={() => setStep("document")}
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

function Field({
  id,
  label,
  value,
  onChange,
  autoComplete,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  autoComplete: string;
  maxLength: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs text-muted-foreground">
        {label}
      </label>
      <FieldBeam>
        <Input
          id={id}
          autoComplete={autoComplete}
          maxLength={maxLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={alvaFieldClass()}
        />
      </FieldBeam>
    </div>
  );
}

/** The sheet's one non-form state: a disc, a line, and what to do about it. */
function Notice({
  tone,
  heading,
  body,
  children,
}: {
  tone: "bad" | "warn";
  heading: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-6 flex flex-col items-center py-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-alva-surface">
        <ShieldCheck
          size={26}
          weight="BoldDuotone"
          className={tone === "bad" ? "text-destructive" : "text-amber-300"}
        />
      </span>
      <p className="mt-3 text-sm font-medium text-foreground">{heading}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{body}</p>
      {children ? (
        <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
          {children}
        </p>
      ) : null}
    </div>
  );
}
