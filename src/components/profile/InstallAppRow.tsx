import Smartphone from "@solar-icons/react/devices/Smartphone";
import { ProfileActionRow } from "@/components/profile/ProfileActionRow";
import { TextureButton } from "@/components/ui/texture-button";
import { promptInstall, useInstallMode } from "@/lib/pwa";

/**
 * Install Alvastudio to the home screen.
 *
 * Only where it can be done: the browser's own prompt, or the iOS steps.
 * Already running as the app, or in a browser that cannot install, there is
 * no row at all.
 */
export function InstallAppRow({ hideDivider }: { hideDivider?: boolean }) {
  const mode = useInstallMode();
  if (mode !== "prompt" && mode !== "ios") return null;

  return (
    <ProfileActionRow
      icon={<Smartphone size={20} weight="Outline" />}
      title="Install the app"
      sheetTitle="Install the app"
      hideDivider={hideDivider}
    >
      {mode === "prompt" ? (
        <TextureButton
          variant="alva"
          size="lg"
          className="mt-6"
          onClick={() => void promptInstall()}
        >
          Install
        </TextureButton>
      ) : (
        <ol className="mt-4 space-y-3 text-sm text-foreground">
          <li>1. Tap the Share button in Safari.</li>
          <li>2. Tap Add to Home Screen.</li>
        </ol>
      )}
    </ProfileActionRow>
  );
}
