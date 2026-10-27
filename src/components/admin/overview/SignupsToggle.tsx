import { useEffect, useState } from "react";
import LockKeyhole from "@solar-icons/react/security/LockKeyhole";
import LockKeyholeUnlocked from "@solar-icons/react/security/LockKeyholeUnlocked";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TextureButton } from "@/components/ui/texture-button";
import { alvaToast } from "@/lib/alva-toast";
import { reportApiError } from "@/lib/api/reportApiError";
import {
  getCapacity,
  isCapacityLocalOnly,
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
 * **While the API has no capacity route this only reaches this browser**, and
 * the dialog says so rather than implying a platform-wide switch. A door the
 * client closes is not closed: `POST /auth/register` is public and anybody
 * can call it directly. The ask is in `docs/backend/endpoints-needed.md`;
 * when it lands this component is unchanged and the warning disappears on
 * its own, because the API's answer carries the figures the local one cannot.
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
  const localOnly = isCapacityLocalOnly(state);

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
        variant={closing ? "minimal" : "alva"}
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
          (closing
            ? "Nobody new will be able to create an account. They will be told the platform is full and that we will write when a place opens. People who already have accounts keep working as normal."
            : "New people will be able to create accounts again.") +
          (localOnly
            ? closing
              ? " This only takes effect in this browser for now, and the API will still accept a sign-up sent to it directly."
              : ""
            : "")
        }
        confirmLabel={closing ? "Close sign-ups" : "Open sign-ups"}
        onConfirm={() => void apply()}
        isPending={working}
      />
    </>
  );
}
