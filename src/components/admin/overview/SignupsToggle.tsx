import { useEffect, useState } from "react";
import LockKeyhole from "@solar-icons/react/security/LockKeyhole";
import LockKeyholeUnlocked from "@solar-icons/react/security/LockKeyholeUnlocked";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TextureButton } from "@/components/ui/texture-button";
import { alvaToast } from "@/lib/alva-toast";
import { reportApiError } from "@/lib/api/reportApiError";
import {
  getCapacity,
  setCapacityOpen,
  type PlatformCapacity,
} from "@/lib/api/capacity";

/**
 * Closes the door on new sign-ups, and opens it again.
 *
 * Both directions ask first. Closing turns away everybody arriving at the
 * sign-up page, and opening lets them back in; neither is the sort of thing
 * to do on a misclick from a page header.
 *
 * **The switch is the server's since 27 Oct.** It used to reach only the
 * browser it was pressed in, with a caveat on the dialog saying so — a door
 * the client closes is not closed, and `POST /auth/register` is public. Now
 * the API enforces it, so the caveat is gone and the dialog can say what
 * actually happens instead.
 *
 * Closing does not turn anybody away. A contributor still signs up, still
 * fills everything in, still gets an email; they wait for a place rather
 * than being refused, and an admin lets them in. That is the sentence the
 * dialog has to carry, because "close sign-ups" sounds like the opposite.
 */
export function SignupsToggle() {
  const [state, setState] = useState<PlatformCapacity | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getCapacity()
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        /* Unknown rather than assumed. The button stays hidden rather than
           offering to close something we cannot read the state of. */
        if (!cancelled) setState(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!state) return null;

  const closing = state.open;

  /* What the switch is actually holding. An admin deciding whether to close
     wants the number in front of them, not in another tab. `accounts`
     counts contributors who are in — the waiting list is not in it. */
  const standing =
    state.limit === null
      ? `${state.accounts} contributor${state.accounts === 1 ? "" : "s"} so far, no limit set.`
      : `${state.accounts} of ${state.limit} places taken.`;

  const apply = async () => {
    setWorking(true);
    try {
      setState(await setCapacityOpen(!state.open));
      alvaToast.success(
        closing ? "Sign-ups are closed" : "Sign-ups are open again"
      );
      setConfirming(false);
    } catch (cause) {
      const message = reportApiError(cause, "Could not change that.");
      if (message) alvaToast.error(message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <TextureButton
        variant="alva"
        size="sm"
        className="w-auto"
        onClick={() => setConfirming(true)}
      >
        {closing ? (
          <LockKeyhole size={15} weight="Outline" />
        ) : (
          <LockKeyholeUnlocked size={15} weight="Outline" />
        )}
        {closing ? "Close sign-ups" : "Open sign-ups"}
      </TextureButton>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={closing ? "Close sign-ups?" : "Open sign-ups again?"}
        description={
          closing
            ? "New contributors can still sign up, but will wait for a place instead of getting in."
            : "New contributors will be let straight in again."
        }
        detail={standing}
        confirmLabel={closing ? "Close sign-ups" : "Open sign-ups"}
        onConfirm={() => void apply()}
        isPending={working}
      />
    </>
  );
}
