import { useEffect, useState } from "react";
import Flag from "@solar-icons/react/ui/Flag";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import { AuthCheckbox } from "@/components/auth/AuthCheckbox";
import { FieldBeam } from "@/components/shared/FieldBeam";
import { alvaFieldClass } from "@/lib/alva-form-styles";
import { FLAG_REASON_LABEL, type ApiFlagIn, type ApiFlagReason } from "@/lib/api/recordingFlags";
import { reportApiError } from "@/lib/api/reportApiError";
import { cn } from "@/lib/utils";

const REASONS = Object.keys(FLAG_REASON_LABEL) as ApiFlagReason[];

const COPY = {
  flag: {
    title: "Flag this submission?",
    description: "For a clip that isn't a real attempt. It's rejected and never paid.",
    confirm: "Flag",
  },
  report: {
    title: "Report this contributor?",
    description: "An admin looks into it, and their uploads pause until then.",
    confirm: "Report",
  },
};

/**
 * Reasons and a note, for a junk flag or a report. The caller sends them:
 * a flag goes with a verdict on the review page and on its own elsewhere.
 */
export function FlagRecordingDialog({
  open,
  onOpenChange,
  mode,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "flag" | "report";
  /** Resolves once sent; a throw is shown in the dialog. */
  onSend: (body: ApiFlagIn) => Promise<void>;
}) {
  const [reasons, setReasons] = useState<ApiFlagReason[]>([]);
  const [note, setNote] = useState("");
  const [isSending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReasons([]);
    setNote("");
    setError(null);
  }, [open]);

  const noteNeeded = reasons.includes("other") && !note.trim();
  const copy = COPY[mode];

  const toggle = (reason: ApiFlagReason, on: boolean) =>
    setReasons((current) => (on ? [...current, reason] : current.filter((value) => value !== reason)));

  const send = async () => {
    if (!reasons.length || noteNeeded) return;
    setSending(true);
    setError(null);
    try {
      await onSend({ reasons, note: note.trim() || undefined });
      onOpenChange(false);
    } catch (cause) {
      setError(reportApiError(cause, cause instanceof Error ? cause.message : "Could not send that. Try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="border-alva-border bg-alva-card sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-foreground">
            <Flag size={20} weight="BoldDuotone" className="text-destructive" />
            {copy.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{copy.description}</p>

          <fieldset className="grid gap-2.5 sm:grid-cols-2">
            <legend className="mb-2 text-xs text-muted-foreground">Reasons</legend>
            {REASONS.map((value) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <AuthCheckbox
                  checked={reasons.includes(value)}
                  onCheckedChange={(on) => toggle(value, on === true)}
                />
                {FLAG_REASON_LABEL[value]}
              </label>
            ))}
          </fieldset>

          <div>
            <label htmlFor="flag-note" className="block text-xs text-muted-foreground">
              {reasons.includes("other") ? "What's wrong" : "Note for admins (optional)"}
            </label>
            <FieldBeam className="mt-1.5">
              <textarea
                id="flag-note"
                rows={3}
                maxLength={500}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className={cn(
                  alvaFieldClass(),
                  "block h-auto w-full resize-none px-3 py-2.5 text-sm leading-relaxed focus-visible:border-transparent"
                )}
              />
            </FieldBeam>
          </div>

          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <TextureButton variant="minimal" size="sm" className="w-auto" onClick={() => onOpenChange(false)}>
              Cancel
            </TextureButton>
            <TextureButton
              variant="destructive"
              size="sm"
              className="w-auto"
              loading={isSending}
              disabled={!reasons.length || noteNeeded}
              onClick={() => void send()}
            >
              {copy.confirm}
            </TextureButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
