import { cn } from "@/lib/utils";

/**
 * An email, drawn as an inbox would draw it.
 *
 * An empty `sandbox`: no scripts, no forms, no navigation, and its own
 * document, so the email's styles and the app's never meet.
 */
export function EmailPreviewFrame({ html, className }: { html: string; className?: string }) {
  return (
    <iframe
      title="Email preview"
      sandbox=""
      srcDoc={html}
      className={cn("h-full w-full rounded-2xl border-0 bg-[#090909]", className)}
    />
  );
}
