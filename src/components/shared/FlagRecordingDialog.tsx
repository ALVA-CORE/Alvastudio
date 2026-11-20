import { useEffect, useState } from "react";
import Flag from "@solar-icons/react/ui/Flag";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TextureButton } from "@/components/ui/texture-button";
import { FieldBeam } from "@/components/shared/FieldBeam";
import { alvaFieldClass } from "@/lib/alva-form-styles";
import {
  FLAG_REASON_LABEL,
  flagRecording,
  type ApiFlagReason,
  type ApiRecordingFlag,
} from "@/lib/api/recordingFlags";
import type { ApiRecording } from "@/lib/api/recordings";
import { reportApiError } from "@/lib/api/reportApiError";
import { cn } from "@/lib/utils";

const REASONS = Object.keys(FLAG_REASON_LABEL) as ApiFlagReason[];

/**
 * Flag a recording for cheating, with a reason. Used on the intern's review
 * page and the admin's recording panel.
 */
export function FlagRecordingDialog({
  open,
  onOpenChange,
  recordingId,
  onFlagged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordingId: string;
  onFlagged: (result: { flag: ApiRecordingFlag; next_recording: ApiRecording | null }) => void;
}) {
  const [reason, setReason] = useState<ApiFlagReason | "">("");
  const [note, setNote] = useState("");
  const [isSending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setNote("");
    setError(null);
  }, [open, recordingId]);

  const noteNeeded = reason === "other" && !note.trim();

  const send = async () => {
    if (!reason || noteNeeded) return;
    setSending(true);
    setError(null);
    try {
      const result = await flagRecording(recordingId, { reason, note: note.trim() || undefined });
      onFlagged(result);
      onOpenChange(false);
    } catch (cause) {
      setError(reportApiError(cause, "Could not flag this recording."));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="border-alva-border bg-alva-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-foreground">
            <Flag size={20} weight="BoldDuotone" className="text-destructive" />
            Flag this recording?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            For cheating, not quality.
          </p>

          <RadioGroup
            value={reason}
            onValueChange={(value) => setReason(value as ApiFlagReason)}
            aria-label="Reason"
            className="grid grid-cols-2 gap-3"
          >
            {REASONS.map((value) => (
              <label key={value} htmlFor={`flag-${value}`} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <RadioGroupItem
                  id={`flag-${value}`}
                  value={value}
                  className="border-alva-border text-muted-foreground data-[state=checked]:border-alva-accent data-[state=checked]:text-alva-accent"
                />
                {FLAG_REASON_LABEL[value]}
              </label>
            ))}
          </RadioGroup>

          <div>
            <label htmlFor="flag-note" className="block text-xs text-muted-foreground">
              {reason === "other" ? "What's wrong" : "Note (optional)"}
            </label>
            <FieldBeam className="mt-1.5">
              <textarea
                id="flag-note"
                rows={3}
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
              disabled={!reason || noteNeeded}
              onClick={() => void send()}
            >
              Flag
            </TextureButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
