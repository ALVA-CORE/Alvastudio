import ChatRoundLike from "@solar-icons/react/messages/ChatRoundLike";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FeedbackForm } from "@/components/profile/FeedbackRow";
import { VerifyIdentitySheet } from "@/components/contributors/wallet/VerifyIdentitySheet";
import { submitNin, useWallet } from "@/data/contributors/walletStore";
import { useNudge, DAYS, MINUTES } from "@/hooks/useNudge";
import { useAuth } from "@/lib/auth/context";
import { alvaToast } from "@/lib/alva-toast";

/**
 * The two things worth interrupting a contributor for, and nothing else.
 *
 * Both wait before they ask. Nothing opens on arrival: a sheet over
 * somebody's first screen is a thing to dismiss rather than read, and it
 * teaches people to close whatever appears.
 *
 * **Verifying a NIN is asked every day until it is done.** It is not a
 * nicety: an unverified contributor can record for weeks and then find they
 * cannot be paid, which is the worst moment to learn it. Five minutes into a
 * session, once a day, and never again once they are verified.
 *
 * **Feedback is asked at most once a day**, and never on the same visit as
 * the NIN prompt. Two sheets in one session is a product talking over
 * somebody trying to work.
 */
export function ContributorNudges() {
  const { user } = useAuth();
  const { wallet, reload } = useWallet();

  /* Keyed per account: two people sharing a laptop should not inherit each
     other's dismissals. */
  const scope = user?.id ?? "anon";

  const verified = wallet?.identity === "verified";
  const knowIdentity = wallet !== null && wallet !== undefined;

  const nin = useNudge({
    key: `alva-nudge-nin:${scope}`,
    after: 5 * MINUTES,
    /* Every day until it is done. Unlike feedback, this one costs them
       money to ignore: an unverified contributor cannot be paid, however
       much they record. */
    quietFor: 1 * DAYS,
    enabled: knowIdentity,
    done: verified,
  });

  const feedback = useNudge({
    key: `alva-nudge-feedback:${scope}`,
    after: 8 * MINUTES,
    quietFor: 1 * DAYS,
    /* Never both in one sitting. */
    enabled: knowIdentity && !nin.open,
    done: false,
  });

  return (
    <>
      {wallet ? (
        <VerifyIdentitySheet
          open={nin.open}
          onOpenChange={(open) => {
            if (!open) nin.dismiss();
          }}
          state={wallet.identity}
          onSubmit={async (ninValue, consent, selfie) => {
            await submitNin(ninValue, consent, selfie);
            reload();
            nin.dismiss();
            alvaToast.success("NIN submitted, we'll let you know");
          }}
        />
      ) : null}

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
          <SheetHeader className="px-10 text-center sm:text-center">
            <SheetTitle className="flex items-center justify-center gap-2">
              <ChatRoundLike size={18} weight="Outline" />
              How is it going?
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6">
            <FeedbackForm />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
