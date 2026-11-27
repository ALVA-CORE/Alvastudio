import ShieldWarning from "@solar-icons/react/security/ShieldWarning";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import UserBlock from "@solar-icons/react/users/UserBlock";
import UserCross from "@solar-icons/react/users/UserCross";
import Letter from "@solar-icons/react/messages/Letter";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TextureButton } from "@/components/ui/texture-button";
import { ApiError } from "@/lib/api/client";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/links";

/** What stopped them, where it is worth saying more than a line. */
export type SignInBlock =
  | "pending"
  | "suspended"
  | "closedDuplicate"
  | "closedReport"
  | "blocked"
  | "full";

/**
 * Why a sign-in was refused, when the reason is about the account.
 *
 * A wrong password belongs under the password field. These two do not: the
 * person typed everything correctly and still cannot get in, and there is
 * nothing on the form for them to fix. An inline error line next to a
 * password box invites them to try the password again.
 *
 * "Full" is the third, and it is not a refusal at all — which is why it is
 * the one that never comes from an error. A contributor signing up while
 * the platform is full gets a `201` with `waitlisted: true`: the account is
 * made, everything they typed is kept, and what is deferred is only the way
 * in. The caller sets this sheet from that flag. It gets a sheet because
 * there is nothing on the form to change, and an inline error would invite
 * another try at a thing that already worked.
 *
 * Deleted accounts are not here. The API answers a deleted account the same
 * way it answers a typo, deliberately, so that nobody can use the sign-in
 * form to find out who has an account. We cannot tell the two apart, and
 * guessing would be worse than the generic line.
 */
const COPY: Record<
  SignInBlock,
  {
    icon: typeof ClockCircle;
    tone: string;
    title: string;
    detail: string;
    /** Subject for the support email, when writing to support is the next step. */
    support?: string;
  }
> = {
  pending: {
    icon: ClockCircle,
    tone: "text-amber-300",
    title: "Waiting for approval",
    detail: "An admin reviews new accounts. You'll be able to sign in once yours is approved.",
  },
  /* No reason given. Duplicates and reports are admin decisions too, so
     this stays true for them, and promises nothing that differs between
     them, such as whether earnings are kept. */
  suspended: {
    icon: UserBlock,
    tone: "text-destructive",
    title: "This account is turned off",
    detail: "An admin turned it off, so you can't sign in for now.",
    support: "My account is turned off",
  },
  /* The pay terms of 27 Oct, in their own words. */
  closedDuplicate: {
    icon: UserCross,
    tone: "text-destructive",
    title: "This account is closed",
    detail:
      "We found more than one account for the same person. All of them are closed, including the first, and nothing is paid on any of them.",
    support: "My account was closed as a duplicate",
  },
  closedReport: {
    icon: UserCross,
    tone: "text-destructive",
    title: "This account is closed",
    detail: "Your recordings were reported, and an admin checked them and agreed with the reports.",
    support: "My account was closed after a report",
  },
  /* Sign-up only: an account was removed and its email kept off. */
  blocked: {
    icon: UserCross,
    tone: "text-destructive",
    title: "This email can't be used",
    detail: "You can't make an account with this email address.",
    support: "My email can't be used to sign up",
  },
  /* Not a refusal of them, and the wording works hard not to read as one:
     they did nothing wrong and there is nothing to fix or try again. */
  full: {
    icon: UsersGroupRounded,
    tone: "text-alva-accent",
    title: "You're on the list",
    detail:
      "Alva Studio is full right now. Your account is saved, and we'll email you the moment a place opens.",
  },
};

/**
 * Why an account was closed: a `code` on the "Inactive account" 403
 * (27 Nov). None means an admin turned it off by hand: `suspended`.
 */
const CLOSED_BY_CODE: Record<string, SignInBlock> = {
  account_closed_duplicate: "closedDuplicate",
  account_closed_report: "closedReport",
};

/**
 * Null when the failure is nothing to open a sheet about.
 *
 * Note what is **not** here: "full". Capacity stopped being an error on
 * 27 Oct — the sign-up succeeds and the account is waitlisted — so there is
 * nothing to detect, and a branch left behind matching "at capacity" would
 * be dead code pattern-matching English that the backend is free to reword.
 *
 * `isWaitlisted` covers the one case where it still arrives as an error: a
 * waitlisted contributor whose session reaches a contributor route anyway.
 */
export function signInBlock(error: unknown): SignInBlock | null {
  if (!(error instanceof ApiError)) return null;
  if (error.isWaitlisted) return "full";
  if (error.isPendingApproval) return "pending";
  if (error.code === "email_blocked") return "blocked";
  if (error.isAccountSuspended) return CLOSED_BY_CODE[error.code ?? ""] ?? "suspended";
  return null;
}

export function SignInBlockedSheet({
  block,
  onOpenChange,
  onDismiss,
  dismissLabel = "Got it",
}: {
  block: SignInBlock | null;
  onOpenChange: (open: boolean) => void;
  /**
   * Where dismissing leads, when there is somewhere worth going.
   *
   * Usually nowhere. A contributor on the waiting list cannot sign in — the
   * account exists but is not approved, so the sign-in form would refuse
   * them — and sending them there would be a second dead end after the
   * first. The sheet just closes.
   */
  onDismiss?: () => void;
  dismissLabel?: string;
}) {
  const copy = block ? COPY[block] : null;
  const Icon = copy?.icon ?? ShieldWarning;

  return (
    <Sheet open={block !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="rounded-t-[28px] border-alva-border bg-alva-card px-5 pb-8 pt-10"
      >
        <div className="flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-alva-surface">
            <Icon size={30} weight="BoldDuotone" className={copy?.tone} />
          </span>

          <SheetHeader className="mt-4 space-y-2">
            <SheetTitle className="text-xl text-foreground">
              {copy?.title}
            </SheetTitle>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {copy?.detail}
            </p>
          </SheetHeader>

          {copy?.support ? (
            <a
              href={supportMailto(copy.support)}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Letter size={16} weight="Linear" />
              Think this is a mistake? <span className="text-primary">{SUPPORT_EMAIL}</span>
            </a>
          ) : null}

          <TextureButton
            variant="alva"
            size="lg"
            className="mt-6 w-auto px-10"
            onClick={() => {
              onOpenChange(false);
              onDismiss?.();
            }}
          >
            {dismissLabel}
          </TextureButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
