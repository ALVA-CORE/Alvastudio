import { useState } from "react";
import { useLocation } from "react-router-dom";
import ChatRoundLike from "@solar-icons/react/messages/ChatRoundLike";
import Plain2 from "@solar-icons/react/messages/Plain2";
import { AlvaSelect } from "@/components/shared/AlvaSelect";
import { ProfileActionRow } from "@/components/profile/ProfileActionRow";
import { PeekRating } from "@/components/ui/peek-rating";
import { TextureButton } from "@/components/ui/texture-button";
import { useAuth } from "@/lib/auth/context";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { alvaToast } from "@/lib/alva-toast";
import { reportApiError } from "@/lib/api/reportApiError";
import {
  FEEDBACK_KIND_LABEL,
  SUPPORT_EMAIL,
  feedbackMailto,
  isMissingRoute,
  submitFeedback,
  type FeedbackDraft,
  type FeedbackKind,
} from "@/lib/api/feedback";

const KINDS: FeedbackKind[] = ["bug", "idea", "confusing", "praise", "other"];

/** Read out under the stars while somebody is choosing. */
const RATING_LABELS = ["Bad", "Poor", "Fine", "Good", "Great"];

const MIN_LENGTH = 10;

/**
 * Tell us what is wrong, from any profile page.
 *
 * The same row on all four roles, because the people who find the problems
 * are the people doing the work, and an intern in a room in Ogun is not going
 * to open a ticket somewhere else.
 *
 * The rating is optional and the writing is not. A star on its own says
 * somebody is unhappy and nothing about why, which is the kind of number that
 * gets reported in a meeting and acted on by nobody.
 *
 * Which page they were on is sent, never typed. "It does not work" is the
 * most common bug report there is, and the route it was sent from is usually
 * enough to find it.
 */
export function FeedbackRow({ hideDivider }: { hideDivider?: boolean }) {
  return (
    <ProfileActionRow
      icon={<ChatRoundLike size={20} weight="Outline" />}
      title="Give feedback"
      sheetTitle="Give feedback"
      hideDivider={hideDivider}
    >
      <FeedbackForm />
    </ProfileActionRow>
  );
}

/**
 * The form itself, without the row that opens it.
 *
 * Pulled out so the same thing can be reached two ways: found deliberately
 * on a profile page, or offered once a day by a prompt. One form, so the two
 * cannot drift into asking different questions.
 */
export function FeedbackForm() {
  const { user } = useAuth();
  const location = useLocation();
  const keyboardInset = useKeyboardInset();

  const [rating, setRating] = useState(0);
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Both, not either. A rating with nothing written is a number nobody can
     act on, and writing without one leaves the table unsortable. */
  const ready = rating > 0 && message.trim().length >= MIN_LENGTH;

  const send = async () => {
    const draft: FeedbackDraft = {
      kind,
      rating,
      message: message.trim(),
      page: location.pathname,
    };

    setError(null);
    setSending(true);

    try {
      await submitFeedback(draft);
      setSent(true);
      alvaToast.success("Thank you, we have it");
    } catch (cause) {
      /* The route does not exist yet. Rather than lose what they wrote, hand
         it to their mail app with everything already filled in. This is the
         whole reason the form ships before the endpoint. */
      if (isMissingRoute(cause)) {
        window.location.href = feedbackMailto(draft, user?.email ?? null);
        setSent(true);
        return;
      }

      setError(reportApiError(cause, "Could not send that."));
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setRating(0);
    setKind("bug");
    setMessage("");
    setSent(false);
    setError(null);
  };

  return (
    <>
      {sent ? (
        <div className="py-2 text-center">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-alva-surface">
            <Plain2 size={26} weight="BoldDuotone" className="text-alva-accent" />
          </span>
          <p className="text-sm text-foreground">Sent. Thank you.</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            We read every one. For anything that needs a reply, email{" "}
            <a className="text-primary hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <TextureButton
            variant="minimal"
            size="sm"
            className="mx-auto mt-4 w-auto"
            onClick={reset}
          >
            Send another
          </TextureButton>
        </div>
      ) : (
        /* Lifted by the on-screen keyboard. A bottom sheet with an input in
           it is otherwise covered by the keyboard on a phone, which is the
           device most of this is written on. */
        <div style={{ paddingBottom: keyboardInset }}>
          {/* Pulled up under the header. The rating reserves 33px above the
              glyphs for the tip that follows the pointer, which reads as a
              gap when nothing is hovering. The room stays, so the tip still
              has somewhere to go; it just stops being blank space. */}
          <div className="-mt-8 flex flex-col items-center">
            <PeekRating
              count={5}
              labels={RATING_LABELS}
              value={rating}
              onChange={setRating}
              size={30}
              ariaLabel="How is Alva Studio working for you"
              activeColor="hsl(var(--alva-accent))"
              idleColor="hsl(var(--muted-foreground))"
              tipColor="hsl(var(--alva-surface))"
              tipTextColor="hsl(var(--foreground))"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              How is it working for you?
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <AlvaSelect
              label="What is this about"
              value={kind}
              onValueChange={(next) => setKind(next as FeedbackKind)}
              options={KINDS.map((value) => ({
                value,
                label: FEEDBACK_KIND_LABEL[value],
              }))}
            />

            <div>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="What happened, and what you expected instead."
                aria-label="Your feedback"
                className="w-full resize-none rounded-xl border border-alva-border bg-alva-surface px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-alva-accent focus-visible:outline-none"
              />
            </div>

            {error ? (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            ) : null}

            <TextureButton
              variant="alva"
              size="lg"
              loading={sending}
              disabled={!ready}
              onClick={() => void send()}
            >
              Send feedback
            </TextureButton>

            <p className="text-center text-xs text-muted-foreground">
              Need a reply? Email{" "}
              <a className="text-primary hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
