import { useEffect, useState } from "react";
import ShieldWarning from "@solar-icons/react/security/ShieldWarning";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AuthCheckbox } from "@/components/auth/AuthCheckbox";
import { ClipPlayer } from "@/components/admin/shared/ClipPlayer";
import { ClipPlayerSkeleton } from "@/components/admin/shared/ClipPlayerSkeleton";
import { TextureButton } from "@/components/ui/texture-button";
import {
  listTurns,
  redactParticipant,
  sessionAudioUrl,
} from "@/lib/api/focusGroups";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";

/** Matches the API's padding, so the figure on screen is the one it will cut. */
const PADDING_SECONDS = 0.5;

/**
 * Cuts a withdrawn participant out of a recording.
 *
 * A withdrawal used to cost the whole room's take. Now their turns are
 * silenced and everyone else's session survives — but only the turns that
 * were TAGGED. Anything they said that nobody marked stays in the file, and
 * no amount of care at this end changes that.
 *
 * So the confirmation is a person's, not ours. The API refuses anything but
 * an explicit `confirm_turns_complete: true`, and the player is here so that
 * tick means something: somebody can listen before giving it.
 *
 * It cannot be undone. The original file is deleted and the new one is what
 * the session has from then on.
 */
export function RedactParticipantSheet({
  open,
  onOpenChange,
  sessionId,
  participantId,
  participantName,
  onRedacted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  participantId: string | null;
  participantName: string;
  onRedacted: () => void;
}) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [turns, setTurns] = useState<{ count: number; seconds: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !sessionId || !participantId) return;

    let cancelled = false;
    let url: string | null = null;

    setConfirmed(false);
    setError(null);
    setTurns(null);
    setAudioLoading(true);

    listTurns(sessionId, participantId)
      .then((rows) => {
        if (cancelled) return;
        setTurns({
          count: rows.length,
          /* Padded either side, as the API will do, so the figure shown is
             the one actually cut rather than the raw turn length. */
          seconds: rows.reduce(
            (total, turn) =>
              total + (turn.end_time - turn.start_time) + PADDING_SECONDS * 2,
            0
          ),
        });
      })
      .catch(() => {
        if (!cancelled) setTurns(null);
      });

    /* Authenticated, so it cannot be an `<audio src>`. */
    sessionAudioUrl(sessionId)
      .then((blobUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        url = blobUrl;
        setAudioUrl(blobUrl);
      })
      .catch(() => setAudioUrl(null))
      .finally(() => {
        if (!cancelled) setAudioLoading(false);
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setAudioUrl(null);
    };
  }, [open, sessionId, participantId]);

  const remove = async () => {
    if (!sessionId || !participantId) return;

    setWorking(true);
    setError(null);

    try {
      await redactParticipant(sessionId, participantId, true);
      alvaToast.success(`${participantName} removed from the recording`);
      onRedacted();
      onOpenChange(false);
    } catch (cause) {
      /* Every refusal here is a 409 with a written reason — work has begun,
         an annotator holds it, the format cannot be rewritten. All of them
         are things the intern can act on, so they stay on screen. */
      setError(reportApiError(cause, "Could not do that.") ?? "Could not do that.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="rounded-t-[28px] border-alva-border bg-alva-card px-5 pb-8 pt-7"
      >
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="flex items-center gap-2 text-xl text-foreground">
            <ShieldWarning size={22} weight="BoldDuotone" className="text-amber-300" />
            Remove from the recording
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {participantName} withdrew, so their turns can be silenced and the
            rest of the session kept. Listen first, because only tagged turns
            are cut.
          </p>

          {audioLoading ? (
            <ClipPlayerSkeleton />
          ) : audioUrl ? (
            <ClipPlayer src={audioUrl} />
          ) : (
            <p className="text-xs text-muted-foreground">
              The audio could not be loaded, so there is nothing to listen to
              here.
            </p>
          )}

          <div className="rounded-2xl bg-alva-surface px-4 py-3">
            <p className="text-xs text-muted-foreground">Will be silenced</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {turns
                ? `${turns.count} ${turns.count === 1 ? "turn" : "turns"}, about ${Math.round(turns.seconds)} seconds`
                : "Counting…"}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Anyone talking over them in those moments goes quiet too: one
              channel cannot be separated. Anything {participantName} said that
              was never tagged as their turn stays in the file.
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-2">
            <AuthCheckbox
              checked={confirmed}
              onCheckedChange={(value) => setConfirmed(value === true)}
              className="mt-0.5"
            />
            <span className="text-xs leading-relaxed text-muted-foreground">
              Every time {participantName} spoke is tagged as their turn.
            </span>
          </label>

          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}

          <p className="text-xs leading-relaxed text-muted-foreground">
            This cannot be undone. The original recording is replaced.
          </p>

          <div className="flex items-center gap-2">
            <TextureButton
              variant="minimal"
              size="lg"
              className="w-auto"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </TextureButton>

            <TextureButton
              variant="destructive"
              size="lg"
              disabled={!confirmed}
              loading={working}
              onClick={() => void remove()}
            >
              Remove from the recording
            </TextureButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
