import Smartphone from "@solar-icons/react/devices/Smartphone";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";

export function ContributorDesktopGate() {
  return (
    <DesktopPageShell className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-alva-card">
          <Smartphone size={32} weight="BoldDuotone" className="text-alva-accent" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-foreground">
          Use your phone
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Alva Studio recording is built for mobile. Open this app on your phone
          to record prompts, stimuli, and manage your profile.
        </p>
      </div>
    </DesktopPageShell>
  );
}
