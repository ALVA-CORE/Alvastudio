import { TextureButton } from "@/components/ui/texture-button";
import { alvaToast } from "@/lib/alva-toast";

/**
 * A new set of recovery codes, shown once (25 Nov): copy or download them
 * now, because the API never shows them again.
 */
export function RecoveryCodesList({ codes }: { codes: string[] }) {
  const text = codes.join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      alvaToast.success("Codes copied");
    } catch {
      alvaToast.error("Could not copy. Select them and copy instead.");
    }
  };

  const download = () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([`${text}\n`], { type: "text/plain" }));
    link.download = "alvastudio-recovery-codes.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-amber-300">These won't be shown again. Each one works once.</p>
      <ol className="grid select-all grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-alva-surface p-3 font-mono text-sm tabular-nums text-foreground">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ol>
      <div className="flex gap-2">
        <TextureButton variant="minimal" size="sm" className="flex-1" onClick={() => void copy()}>
          Copy
        </TextureButton>
        <TextureButton variant="minimal" size="sm" className="flex-1" onClick={download}>
          Download
        </TextureButton>
      </div>
    </div>
  );
}
