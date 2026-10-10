import { useState } from "react";
import ShieldCheck from "@solar-icons/react/security/ShieldCheck";
import AltArrowRight from "@solar-icons/react/arrows/AltArrowRight";
import { Separator } from "@/components/ui/separator";
import { VerifyIdentitySheet } from "@/components/contributors/wallet/VerifyIdentitySheet";
import {
  setIdentityState,
  useWallet,
} from "@/data/contributors/walletStore";
import { alvaToast } from "@/lib/alva-toast";
import type { IdentityState } from "@/data/contributors/wallet";
import { cn } from "@/lib/utils";

const LABEL: Record<IdentityState, string> = {
  unverified: "Not verified",
  pending: "Checking",
  verified: "Verified",
};

const TINT: Record<IdentityState, string> = {
  unverified: "text-muted-foreground",
  pending: "text-amber-300",
  verified: "text-alva-accent",
};

/**
 * Identity verification, reachable after the fact.
 *
 * The wallet asks for it once, at the moment it matters, and then stops
 * asking. But a submission that is still being checked is a thing people come
 * back to look at, and a one-time flow with no second door creates exactly one
 * question: where did that go. This is the second door.
 *
 * It mirrors `ProfileActionRow` rather than using it, because that component
 * owns its own sheet and the verification sheet is a form with its own state.
 */
export function IdentityProfileRow({ hideDivider = false }: { hideDivider?: boolean }) {
  const wallet = useWallet();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="alva-row flex w-full items-center gap-3 py-4 text-left"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-alva-surface text-muted-foreground">
            <ShieldCheck size={20} weight="Outline" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Identity verification
            </p>
          </div>

          <span className={cn("shrink-0 text-xs", TINT[wallet.identity])}>
            {LABEL[wallet.identity]}
          </span>

          <AltArrowRight
            size={18}
            weight="Outline"
            className="shrink-0 text-muted-foreground"
          />
        </button>

        {!hideDivider && (
          <Separator className="ml-[3.25rem] w-[calc(100%-3.25rem)]" />
        )}
      </div>

      <VerifyIdentitySheet
        open={open}
        onOpenChange={setOpen}
        state={wallet.identity}
        onSubmit={() => {
          setIdentityState("pending");
          setOpen(false);
          alvaToast.success("NIN submitted, we'll let you know");
        }}
      />
    </>
  );
}
