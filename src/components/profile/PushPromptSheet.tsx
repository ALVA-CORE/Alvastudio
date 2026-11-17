import { useState } from "react";
import Bell from "@solar-icons/react/notifications/Bell";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TextureButton } from "@/components/ui/texture-button";
import { alvaToast } from "@/lib/alva-toast";
import { ApiError } from "@/lib/api/client";
import { reportApiError } from "@/lib/api/reportApiError";
import { turnOnPush } from "@/lib/push";

/**
 * Asks, now and then, to turn on push notifications: the same switch as the
 * profile row, offered where it is easy to say yes. Only this one has
 * "Don't show me again"; the profile row is somewhere people go on purpose.
 */
export function PushPromptSheet({
  open,
  onClose,
  onNever,
}: {
  open: boolean;
  /** Closed or done: ask again another time. */
  onClose: () => void;
  onNever: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const turnOn = async () => {
    setBusy(true);
    try {
      await turnOnPush();
      alvaToast.success("Notifications are on");
      onClose();
    } catch (cause) {
      const message =
        cause instanceof ApiError && cause.status === 503
          ? "Push notifications are not available right now."
          : reportApiError(cause, "Could not turn them on.");
      if (message) alvaToast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="rounded-t-[28px] border-alva-border bg-alva-card px-5 pb-8 pt-10"
      >
        <div className="flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-alva-surface">
            <Bell size={30} weight="BoldDuotone" className="text-alva-accent" />
          </span>

          <SheetHeader className="mt-4 space-y-2">
            <SheetTitle className="text-xl text-foreground">Turn on notifications</SheetTitle>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Know straight away when your recordings are approved and when you're paid.
            </p>
          </SheetHeader>

          <TextureButton
            variant="alva"
            size="lg"
            className="mt-6 w-auto px-10"
            loading={busy}
            onClick={() => void turnOn()}
          >
            Turn on
          </TextureButton>

          <button
            type="button"
            onClick={onNever}
            className="mt-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Don't show me again
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
