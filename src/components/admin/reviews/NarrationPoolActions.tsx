import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TextureButton } from "@/components/ui/texture-button";
import { ApiError } from "@/lib/api/client";
import {
  sendNarrations,
  withdrawNarrations,
  type ApiNarrationSend,
} from "@/lib/api/annotations";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";

const narrations = (n: number) => `${n.toLocaleString()} ${n === 1 ? "narration" : "narrations"}`;

/** "3 skipped", or nothing. */
const skippedNote = (skipped: string[]) =>
  skipped.length > 0 ? `, ${skipped.length.toLocaleString()} skipped` : "";

/**
 * Sends the ticked clips to the annotators' pool, or takes them back.
 *
 * Sending is previewed first, as the bulk delete is: the API says how many
 * go and which it skips, the admin confirms, and the apply carries that
 * count so a choice that changed in between is refused (409) rather than
 * half done.
 */
export function NarrationPoolActions({
  ids,
  ready,
  onDone,
}: {
  /** Recording ids, up to 100. */
  ids: string[];
  /** How many of them are approved Stimuli clips: the only ones that can go. */
  ready: number;
  onDone: () => void;
}) {
  const [plan, setPlan] = useState<{ ids: string[]; result: ApiNarrationSend } | null>(null);
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const report = (cause: unknown, fallback: string) => {
    const message = reportApiError(cause, fallback);
    if (message) alvaToast.error(message);
  };

  const preview = async (picked: string[]) => {
    setChecking(true);
    try {
      const result = await sendNarrations(picked);
      if (result.sent === 0) {
        setPlan(null);
        alvaToast.show("These were sent to the annotators before.", { variant: "default" });
        return;
      }
      setPlan({ ids: picked, result });
    } catch (cause) {
      report(cause, "Could not check those clips.");
    } finally {
      setChecking(false);
    }
  };

  const apply = async () => {
    if (!plan) return;
    setSending(true);
    try {
      const done = await sendNarrations(plan.ids, plan.result.sent);
      alvaToast.success(`${narrations(done.sent)} sent to the annotators${skippedNote(done.skipped)}`);
      setPlan(null);
      onDone();
    } catch (cause) {
      /* The choice changed since the preview and nothing was sent: new numbers. */
      if (cause instanceof ApiError && cause.status === 409) {
        alvaToast.error(cause.message);
        setSending(false);
        await preview(plan.ids);
        return;
      }
      report(cause, "Could not send those narrations.");
    } finally {
      setSending(false);
    }
  };

  const withdraw = async () => {
    setWithdrawing(true);
    try {
      const done = await withdrawNarrations(ids);
      alvaToast.show(`${narrations(done.withdrawn.length)} taken back${skippedNote(done.skipped)}`, {
        variant: done.withdrawn.length > 0 ? "success" : "default",
      });
      onDone();
    } catch (cause) {
      report(cause, "Could not take those narrations back.");
    } finally {
      setWithdrawing(false);
    }
  };

  const skipped = plan?.result.skipped.length ?? 0;

  return (
    <>
      <TextureButton
        variant="alva"
        size="sm"
        className="ml-1 w-auto"
        loading={checking}
        disabled={ready === 0}
        title={ready === 0 ? "Only approved Stimuli clips can be sent" : undefined}
        onClick={() => void preview(ids)}
      >
        Send to annotators
      </TextureButton>
      <TextureButton
        variant="minimal"
        size="sm"
        className="ml-1 w-auto"
        loading={withdrawing}
        onClick={() => void withdraw()}
      >
        Take back
      </TextureButton>

      <ConfirmDialog
        open={plan !== null}
        onOpenChange={(open) => {
          if (!open && !sending && !checking) setPlan(null);
        }}
        tone="default"
        title={`Send ${narrations(plan?.result.sent ?? 0)} to the annotators?`}
        description={
          skipped > 0
            ? `${skipped.toLocaleString()} skipped: not approved Stimuli clips, or sent before.`
            : "Annotators can take them from the pool straight away."
        }
        confirmLabel="Send"
        isPending={sending || checking}
        onConfirm={() => void apply()}
      />
    </>
  );
}
