import { useEffect, useState } from "react";
import ChatRoundLike from "@solar-icons/react/messages/ChatRoundLike";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FeedbackForm } from "@/components/profile/FeedbackRow";
import { VerifyIdentitySheet } from "@/components/contributors/wallet/VerifyIdentitySheet";
import { submitIdentityDocument, useWallet } from "@/data/contributors/walletStore";
import { useNudge, DAYS, MINUTES } from "@/hooks/useNudge";
import { usePushStatus } from "@/lib/push";
import { PushPromptSheet } from "@/components/profile/PushPromptSheet";
import { useAuth } from "@/lib/auth/context";
import { alvaToast } from "@/lib/alva-toast";
import { cn } from "@/lib/utils";

/**
 * The three things worth interrupting a contributor for, and nothing else.
 *
 * Both wait before they ask. Nothing opens on arrival: a sheet over
 * somebody's first screen is a thing to dismiss rather than read, and it
 * teaches people to close whatever appears.
 *
 * **Verifying identity is asked every day until it is done.** It is not a
 * nicety: an unverified contributor can record for weeks and then find they
 * cannot be paid, which is the worst moment to learn it. Five minutes into a
 * session, once a day, and never again once it is done.
 *
 * "Done" means submitted, not passed. Document review takes a person, and
 * asking somebody to upload their ID again tomorrow because nobody has read
 * yesterday's yet is how you get four copies of the same card.
 *
 * **Feedback is asked at most once a day**, and never on the same visit as
 * the identity prompt. Two sheets in one session is a product talking over
 * somebody trying to work.
 */
export function ContributorNudges() {
  const { user } = useAuth();
  const { wallet, reload } = useWallet();

  /* Keyed per account: two people sharing a laptop should not inherit each
     other's dismissals. */
  const scope = user?.id ?? "anon";

  /* Anything but "we have never heard from you" counts as handled. A
     submission already under review is not something another upload moves
     along, and a failed one is answered in the wallet rather than by a sheet
     that opens on its own. */
  const handled = wallet?.identity !== "unverified";
  const knowIdentity = wallet !== null && wallet !== undefined;

  const identity = useNudge({
    key: `alva-nudge-nin:${scope}`,
    after: 5 * MINUTES,
    /* Every day until it is done. Unlike feedback, this one costs them
       money to ignore: an unverified contributor cannot be paid, however
       much they record. */
    quietFor: 1 * DAYS,
    enabled: knowIdentity,
    done: handled,
  });

  /* Push, every few days until it is on, once identity is done: that one
     matters more, and two sheets in one sitting is one too many. Never where
     it cannot work, or once it is on or blocked. */
  const pushStatus = usePushStatus();
  const push = useNudge({
    key: `alva-nudge-push:${scope}`,
    after: 3 * MINUTES,
    quietFor: 3 * DAYS,
    enabled: knowIdentity && handled,
    done: pushStatus !== "off",
  });
  const [pushAsked, setPushAsked] = useState(false);
  useEffect(() => {
    if (push.open) setPushAsked(true);
  }, [push.open]);

  const feedback = useNudge({
    key: `alva-nudge-feedback:${scope}`,
    after: 8 * MINUTES,
    quietFor: 1 * DAYS,
    /* Never two in one sitting. */
    enabled: knowIdentity && !identity.open && !pushAsked,
    done: false,
  });
  const [feedbackSent, setFeedbackSent] = useState(false);

  return (
    <>
      {wallet ? (
        <VerifyIdentitySheet
          open={identity.open}
          onOpenChange={(open) => {
            if (!open) identity.dismiss();
          }}
          state={wallet.identity}
          nextAction={wallet.nextAction}
          detail={wallet.identityDetail}
          onSubmit={async (submission) => {
            const { detail } = await submitIdentityDocument(submission, {
              needsAccount: wallet.nextAction === "create_account",
            });
            reload();
            identity.dismiss();
            alvaToast.success(detail);
          }}
        />
      ) : null}

      <PushPromptSheet open={push.open} onClose={push.dismiss} onNever={push.never} />

      <Sheet
        open={feedback.open}
        onOpenChange={(open) => {
          if (!open) feedback.dismiss();
        }}
      >
        <SheetContent
          side="bottom"
          aria-describedby={undefined}
          className="rounded-t-[28px] border-alva-border bg-alva-card px-5 pb-8 pt-8"
        >
          {/* Once sent, the thank-you says it all. */}
          <SheetHeader className={cn("px-10 text-center sm:text-center", feedbackSent && "sr-only")}>
            <SheetTitle className="flex items-center justify-center gap-2">
              <ChatRoundLike size={18} weight="Outline" />
              How is it going?
            </SheetTitle>
          </SheetHeader>

          <div className={cn(!feedbackSent && "mt-6")}>
            <FeedbackForm onSentChange={setFeedbackSent} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
