import { useState } from "react";
import Bell from "@solar-icons/react/notifications/Bell";
import BellOff from "@solar-icons/react/notifications/BellOff";
import { ProfileActionRow } from "@/components/profile/ProfileActionRow";
import { AlvaEmptyState } from "@/components/shared/states/AlvaEmptyState";
import { TextureButton } from "@/components/ui/texture-button";
import { alvaToast } from "@/lib/alva-toast";
import { ApiError } from "@/lib/api/client";
import { sendTestPush } from "@/lib/api/push";
import { reportApiError } from "@/lib/api/reportApiError";
import { turnOffPush, turnOnPush, usePushStatus } from "@/lib/push";

/**
 * Push notifications on this device, on every role's profile.
 *
 * Not there where the browser cannot take them: no service worker or no
 * `PushManager`, which includes an iPhone outside the installed app.
 */
export function PushNotificationsRow({ hideDivider }: { hideDivider?: boolean }) {
  const status = usePushStatus();
  const [busy, setBusy] = useState<"on" | "off" | "test" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status === "unsupported") return null;

  const run = async (which: "on" | "off" | "test", work: () => Promise<unknown>) => {
    setError(null);
    setBusy(which);
    try {
      await work();
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 503
          ? "Push notifications are not available right now."
          : reportApiError(cause, "Something went wrong. Try again.")
      );
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    const { sent } = await sendTestPush();
    if (sent > 0) alvaToast.success("Test sent");
    else alvaToast.error("It did not reach this device. Turn it off and on again.");
  };

  return (
    <ProfileActionRow
      icon={<Bell size={20} weight="Outline" />}
      title="Push notifications"
      value={
        <span className="text-xs text-muted-foreground">{status === "on" ? "On" : "Off"}</span>
      }
      sheetTitle="Push notifications"
      hideDivider={hideDivider}
    >
      {status === "blocked" ? (
        <AlvaEmptyState
          compact
          icon={<BellOff size={22} weight="Outline" />}
          title="Notifications are blocked"
          description="Allow them for Alvastudio in your settings."
        />
      ) : status === "on" ? (
        <div className="grid grid-cols-2 gap-2">
          <TextureButton
            variant="secondary"
            size="lg"
            loading={busy === "test"}
            disabled={busy !== null}
            onClick={() => void run("test", test)}
          >
            Send a test
          </TextureButton>
          <TextureButton
            variant="minimal"
            size="lg"
            loading={busy === "off"}
            disabled={busy !== null}
            onClick={() => void run("off", turnOffPush)}
          >
            Turn off
          </TextureButton>
        </div>
      ) : (
        <TextureButton
          variant="alva"
          size="lg"
          loading={busy === "on"}
          disabled={busy !== null}
          onClick={() => void run("on", turnOnPush)}
        >
          Turn on
        </TextureButton>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-center text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </ProfileActionRow>
  );
}
