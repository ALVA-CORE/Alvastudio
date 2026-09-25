import Monitor from "@solar-icons/react/devices/Monitor";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";

/**
 * Admin is desktop-only, and more firmly so than annotation: every area is a
 * wide table or a chart, and the destructive actions (deactivating a user,
 * retiring a prompt) are not ones to take on a phone. Mirrors
 * <AnnotatorMobileGate />.
 */
export function AdminMobileGate() {
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
          Admin tools are desktop-only — the corpus tables, prompt banks and
          payment records need the width. Open Alvastudio on a laptop or desktop
          to manage the project.
        </p>
      </div>
    </DesktopPageShell>
  );
}
