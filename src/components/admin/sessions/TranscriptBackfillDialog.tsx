import { useEffect, useState } from "react";
import ClapperboardText from "@solar-icons/react/video/ClapperboardText";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import { backfillTranscripts } from "@/lib/api/focusGroups";
import { reportApiError } from "@/lib/api/reportApiError";
import { ApiError } from "@/lib/api/client";
import { alvaToast } from "@/lib/alva-toast";

type Preview = {
  sessions: number;
  audio_seconds: number;
  unmeasured_sessions: number;
  previously_failed: number;
};

/** Seconds as hours, because that is what the bill is read in. */
function hours(seconds: number) {
  return `${(seconds / 3600).toFixed(1)}h`;
}

/**
 * Queues old sessions for a draft transcript.
 *
 * New audio is queued by the API on its own; this is for sessions recorded
 * before the feature existed, and for ones that failed.
 *
 * **It previews first, and the preview is free.** ElevenLabs bills on audio
 * length, so `audio_seconds` is the number an admin is actually approving —
 * a session count would hide the difference between forty short sessions
 * and four long ones.
 *
 * `unmeasured_sessions` is shown separately because those are sessions
 * whose length could not be read: they will still be transcribed and still
 * billed, so the figure above them is a floor rather than a total.
 *
 * `503` means the feature is switched off — no ElevenLabs key — which is a
 * state rather than a fault, and says so.
 */
export function TranscriptBackfillDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [offline, setOffline] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    setPreview(null);
    setOffline(false);
    setError(null);

    backfillTranscripts()
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        if (cause instanceof ApiError && cause.status === 503) {
          setOffline(true);
          return;
        }
        setError(reportApiError(cause, "Could not read what is outstanding."));
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const apply = async () => {
    setWorking(true);
    setError(null);

    try {
      const result = await backfillTranscripts(true);
      alvaToast.success(
        result.sessions === 1
          ? "1 session queued for transcription"
          : `${result.sessions} sessions queued for transcription`
      );
      onOpenChange(false);
    } catch (cause) {
      setError(reportApiError(cause, "Could not queue those sessions."));
    } finally {
      setWorking(false);
    }
  };

  const nothingDue = preview?.sessions === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-alva-border bg-alva-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <ClapperboardText size={18} weight="Outline" className="text-alva-accent" />
            Transcribe older sessions
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            New recordings are transcribed on their own. This is for sessions
            recorded before that started, and for any that failed.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </p>
        ) : null}

        {offline ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Transcription is switched off on this server, so there is nothing
            to queue.
          </p>
        ) : preview ? (
          nothingDue ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Nothing is outstanding. Every session that can be transcribed
              already has been, or is on its way.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Figure label="Sessions" value={String(preview.sessions)} />
                {/* The billed number, not the session count. Forty short
                    sessions and four long ones cost very differently. */}
                <Figure label="Audio to transcribe" value={hours(preview.audio_seconds)} accent />
              </div>

              {preview.unmeasured_sessions > 0 ? (
                <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-300">
                  {preview.unmeasured_sessions} of these could not be measured,
                  so the figure above is a floor rather than the total.
                </p>
              ) : null}

              {preview.previously_failed > 0 ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {preview.previously_failed}{" "}
                  {preview.previously_failed === 1 ? "has" : "have"} failed
                  before and will be tried again.
                </p>
              ) : null}
            </>
          )
        ) : (
          <p className="text-sm text-muted-foreground">Working out what is left…</p>
        )}

        <div className="flex gap-2">
          {preview && !nothingDue && !offline ? (
            <TextureButton
              variant="alva"
              size="sm"
              className="w-auto"
              loading={working}
              onClick={() => void apply()}
            >
              Queue {preview.sessions}{" "}
              {preview.sessions === 1 ? "session" : "sessions"}
            </TextureButton>
          ) : null}

          <TextureButton
            variant={preview && !nothingDue && !offline ? "minimal" : "alva"}
            size="sm"
            className="w-auto"
            onClick={() => onOpenChange(false)}
          >
            {preview && !nothingDue && !offline ? "Cancel" : "Done"}
          </TextureButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Figure({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-alva-surface px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          accent
            ? "mt-1 text-lg font-semibold tabular-nums text-alva-accent"
            : "mt-1 text-lg font-semibold tabular-nums text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}
