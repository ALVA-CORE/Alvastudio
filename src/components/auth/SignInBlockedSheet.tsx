import ShieldWarning from "@solar-icons/react/security/ShieldWarning";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import UserBlock from "@solar-icons/react/users/UserBlock";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TextureButton } from "@/components/ui/texture-button";
import { ApiError } from "@/lib/api/client";

/** What stopped them, where it is worth saying more than a line. */
export type SignInBlock = "pending" | "suspended" | "full";

/**
 * Why a sign-in was refused, when the reason is about the account.
 *
 * A wrong password belongs under the password field. These two do not: the
 * person typed everything correctly and still cannot get in, and there is
 * nothing on the form for them to fix. An inline error line next to a
 * password box invites them to try the password again.
 *
 * "Full" is the third, and it is not about the person at all: the platform
 * has as many accounts as it can take. It gets a sheet rather than a line
 * under a field because there is nothing on the form to change — trying a
 * different password or a different email will not help, and an inline error
 * invites exactly that.
 *
 * Deleted accounts are not here. The API answers a deleted account the same
 * way it answers a typo, deliberately, so that nobody can use the sign-in
 * form to find out who has an account. We cannot tell the two apart, and
 * guessing would be worse than the generic line.
 */
const COPY: Record<
  SignInBlock,
  { icon: typeof ClockCircle; tone: string; title: string; detail: string }
> = {
  pending: {
    icon: ClockCircle,
    tone: "text-amber-300",
    title: "Waiting for approval",
    detail: "An admin reviews new accounts. You'll be able to sign in once yours is approved.",
  },
  suspended: {
    icon: UserBlock,
    tone: "text-destructive",
    title: "This account is turned off",
    detail: "An admin can turn it back on. Your work is kept either way.",
  },
  /* Not a refusal of them, and the wording works hard not to read as one:
     they did nothing wrong and there is nothing to fix or try again. */
  full: {
    icon: UsersGroupRounded,
    tone: "text-alva-accent",
    title: "We are full for now",
    detail:
      "Alva Studio has as many people as it can take at the moment. We have your email and will write to you the moment a place opens up.",
  },
};

/** Null when the failure is nothing to open a sheet about. */
export function signInBlock(error: unknown): SignInBlock | null {
  if (!(error instanceof ApiError)) return null;
  if (error.isAtCapacity) return "full";
  if (error.isPendingApproval) return "pending";
  if (error.isAccountSuspended) return "suspended";
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
   * Where dismissing leads, when staying is pointless.
   *
   * A sign-up page that is closed has nothing behind this sheet: closing it
   * would drop somebody back onto a form that cannot submit. The sign-in
   * page is different — the form there is still worth another try with
   * another account — so it passes nothing and the sheet just closes.
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
