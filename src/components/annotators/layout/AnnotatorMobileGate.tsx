import Monitor from "@solar-icons/react/devices/Monitor";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";

/**
 * Annotation is desktop work — multi-speaker audio, long sessions, dense
 * tagging. Mirrors <ContributorDesktopGate /> in the opposite direction.
 */
export function AnnotatorMobileGate() {
  return (
    <DesktopPageShell className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-alva-card">
          <Monitor size={32} weight="BoldDuotone" className="text-alva-accent" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-foreground">
          Use a bigger screen
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Focus group annotation needs room for the waveform, speaker turns and
          tag rail. Open Alva Studio on a laptop or desktop to pick up your
          queue.
        </p>
      </div>
    </DesktopPageShell>
  );
}
