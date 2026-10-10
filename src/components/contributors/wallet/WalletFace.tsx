import { useState, type ReactNode } from "react";
import CashOut from "@solar-icons/react/money/CashOut";
import CardSend from "@solar-icons/react/money/CardSend";
import ShieldCheck from "@solar-icons/react/security/ShieldCheck";
import ClipboardList from "@solar-icons/react/notes/ClipboardList";
import CupStar from "@solar-icons/react/ui/CupStar";
import { CardStack } from "@/components/contributors/wallet/CardStack";
import { WalletShell } from "@/components/contributors/wallet/WalletShell";
import { LinkBankSheet } from "@/components/contributors/wallet/LinkBankSheet";
import { VerifyIdentitySheet } from "@/components/contributors/wallet/VerifyIdentitySheet";
import { WalletHistorySheet } from "@/components/contributors/dashboard/WalletHistorySheet";
import { alvaToast } from "@/lib/alva-toast";
import { alvaDarkTexture } from "@/lib/alva-texture";
import {
  formatWalletNaira,
  type IdentityState,
  type PayoutAccount,
  type Wallet,
} from "@/data/contributors/wallet";
import { TextureButton } from "@/components/ui/texture-button";
import { cn } from "@/lib/utils";

/**
 * The wallet: a card in a pocket, with the three things you can do from here.
 *
 * The actions sit on the flap rather than under the wallet. A wallet with its
 * buttons floating below it is a picture of a wallet next to some buttons;
 * putting them on the leather makes the whole thing one object.
 *
 * "Payout" is back beside "Withdraw", and the two are different things:
 * Withdraw moves money, Payout decides where money lands. It lived on the card
 * for a while, but a card you tap to open a form cannot also be a card you
 * shuffle, and the stack is worth more than the shortcut.
 */

/* ---------------------------------------------------------------------------
 * Flap tuning
 *
 * `ICON_TOP` is the gap between the top of the leather and the row of
 * buttons. Raise it to push them further down the flap, lower it to tuck them
 * under the dip.
 * ------------------------------------------------------------------------- */
const ICON_TOP = "pt-9";
export function WalletFace({
  wallet,
  onLinkAccount,
  onVerifyIdentity,
  onShowPoints,
  className,
}: {
  wallet: Wallet;
  onLinkAccount: (account: PayoutAccount) => void;
  onVerifyIdentity: (state: IdentityState) => void;
  /** Turns the card back over. Lives here so all three verbs sit together. */
  onShowPoints: () => void;
  className?: string;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [pulled, setPulled] = useState(false);

  const verified = wallet.identity === "verified";
  const linked = Boolean(wallet.payoutAccount);
  const canWithdraw = verified && linked && wallet.balanceKobo > 0;

  return (
    <div className={cn("w-full", className)}>
      <IdentityGate state={wallet.identity} onStart={() => setVerifyOpen(true)}>
      <WalletShell
        pulled={pulled}
        card={
          <CardStack
            pulled={pulled}
            onPulledChange={setPulled}
            cards={[
              {
                id: "available",
                label: "Available",
                caption: linked
                  ? `Paid into ${wallet.payoutAccount?.bank}`
                  : "No bank linked yet",
                kobo: wallet.balanceKobo,
              },
              {
                id: "held",
                label: "On hold",
                caption: "Clears once review is done",
                kobo: wallet.pendingKobo,
              },
              {
                id: "sending",
                label: "On the way",
                caption: "Sent, waiting to settle",
                kobo: wallet.inFlightKobo,
              },
              {
                id: "paid",
                label: "Paid out",
                caption: "Everything sent to your bank",
                kobo: wallet.paidKobo,
              },
            ]}
          />
        }
        flapContent={
          /* Spread across the full width of the leather rather than spaced by
             a fixed gap, which ran the three labels into each other on a
             narrow phone. */
          <div className={cn("flex w-full items-start justify-around px-3", ICON_TOP)}>
            <WalletAction
              label="Withdraw"
              icon={<CashOut size={18} weight="Outline" />}
              disabled={!canWithdraw}
              hint={
                !verified
                  ? "Verify your identity first"
                  : !linked
                    ? "Link a bank first"
                    : wallet.balanceKobo === 0
                      ? "Nothing to withdraw yet"
                      : undefined
              }
              onClick={() =>
                alvaToast.success(
                  `${formatWalletNaira(wallet.balanceKobo)} on the way`
                )
              }
            />
            <WalletAction
              label="Payout"
              icon={<CardSend size={18} weight="Outline" />}
              disabled={!verified}
              hint={verified ? undefined : "Verify your identity first"}
              onClick={() => setLinkOpen(true)}
            />
            <WalletAction
              label="History"
              icon={<ClipboardList size={18} weight="Outline" />}
              onClick={() => setHistoryOpen(true)}
            />
            <WalletAction
              label="Points"
              icon={<CupStar size={18} weight="Outline" />}
              onClick={onShowPoints}
            />
          </div>
        }
      />
      </IdentityGate>

      <LinkBankSheet
        open={linkOpen}
        onOpenChange={setLinkOpen}
        existing={wallet.payoutAccount}
        onLink={(account) => {
          onLinkAccount(account);
          alvaToast.success("Bank account linked");
        }}
      />

      <WalletHistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        wallet={wallet}
      />

      <VerifyIdentitySheet
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        state={wallet.identity}
        onSubmit={() => {
          onVerifyIdentity("pending");
          setVerifyOpen(false);
          alvaToast.success("NIN submitted, we'll let you know");
        }}
      />
    </div>
  );
}

function WalletAction({
  label,
  icon,
  onClick,
  disabled = false,
  hint,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** Why it is unavailable. Carried as the title, not as a third line. */
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? hint : undefined}
      className={cn(
        "group flex min-w-0 flex-col items-center gap-1.5 focus-visible:outline-none",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      {/* Textured disc on the darkest surface, the same face the accent
          buttons wear, so the three actions belong to the same kit as every
          other control. The glyph is small inside it: a tight fit made three
          buttons; a loose one makes three holes. */}
      <span
        className={alvaDarkTexture(
          cn(
            "flex size-11 items-center justify-center rounded-full text-foreground transition-colors",
            !disabled && "group-hover:text-alva-accent",
            "group-focus-visible:ring-2 group-focus-visible:ring-alva-accent"
          )
        )}
      >
        {/* Above the sheen, which is an absolutely positioned ::before. */}
        <span className="relative z-[1] flex">{icon}</span>
      </span>
      <span className="truncate text-[11px] text-muted-foreground">{label}</span>
    </button>
  );
}

/**
 * Blurs the wallet until identity is verified.
 *
 * The figures stay on screen rather than being replaced: they are the
 * contributor's own earnings, and hiding them to make a point punishes someone
 * for a step nobody has asked them to take yet. Blurred, they read as "yours,
 * not reachable", which is exactly the state.
 *
 * It wraps the whole wallet, not the cards alone. Blurring only the cards left
 * the flap and its four buttons sharp on top of the message, which looked like
 * a rendering fault rather than a locked state.
 *
 * No panel behind the text either. The blur is heavy enough that nothing
 * underneath competes, and a card floating over a blurred card is one surface
 * too many.
 */
function IdentityGate({
  state,
  onStart,
  children,
}: {
  state: IdentityState;
  onStart: () => void;
  children: ReactNode;
}) {
  if (state === "verified") return <>{children}</>;

  const pending = state === "pending";

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none select-none blur-[14px]">
        {children}
      </div>

      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center px-8 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-alva-bg/70">
          <ShieldCheck
            size={22}
            weight="BoldDuotone"
            className={pending ? "text-amber-300" : "text-alva-accent"}
          />
        </span>

        <p className="mt-3 text-sm font-semibold text-foreground">
          {pending ? "We're checking your NIN" : "Verify your identity"}
        </p>
        <p className="mt-1 max-w-[17rem] text-xs text-muted-foreground">
          {pending
            ? "Your earnings keep adding up while we check."
            : "We need your NIN before any of this can be paid out."}
        </p>

        <TextureButton
          variant="alva"
          size="sm"
          className="mt-3.5 w-auto"
          onClick={onStart}
        >
          {pending ? "Check status" : "Verify now"}
        </TextureButton>
      </div>
    </div>
  );
}
