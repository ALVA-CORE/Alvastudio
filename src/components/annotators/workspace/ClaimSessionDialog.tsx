import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import ClipboardCheck from "@solar-icons/react/notes/ClipboardCheck";

/**
 * Claim a session you opened but have not taken.
 *
 * Reaching the workspace for an unclaimed session used to be a dead end: a
 * "not found" page, which was wrong twice over. The session exists, and the
 * thing standing between the annotator and it is one button.
 *
 * It is a modal over the workspace rather than a page, because claiming is not
 * a destination — the annotator is already where they want to be, and the
 * answer to "can I work on this" should not cost a navigation either way.
 */
export function ClaimSessionDialog({
  open,
  topic,
  isClaiming,
  onClaim,
  onCancel,
}: {
  open: boolean;
  /** What the session is about, when we know. A code is not worth reading. */
  topic?: string;
  isClaiming: boolean;
  onClaim: () => void;
  onCancel: () => void;
}) {
  const [tried, setTried] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-w-md rounded-3xl border-alva-border bg-alva-card">
        <DialogHeader>
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-alva-surface">
            <ClipboardCheck size={22} weight="BoldDuotone" className="text-alva-accent" />
          </span>
          <DialogTitle className="mt-3 text-center text-xl text-foreground">
            Claim this session?
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            {topic
              ? `"${topic}" is not on your desk yet. Claiming it takes it out of the shared queue and opens the workspace.`
              : "This session is not on your desk yet. Claiming it takes it out of the shared queue and opens the workspace."}
          </DialogDescription>
        </DialogHeader>

        {/* `claim-next` takes the top of the queue, not a chosen session, so
            whoever is first in line is what you get. Said plainly, because
            being handed a different session without warning is worse than
            being told it might happen. */}
        <p className="rounded-xl bg-alva-surface px-3 py-2.5 text-xs text-muted-foreground">
          You will be given the next session in the queue, which may not be this
          one.
        </p>

        <div className="flex gap-2">
          <TextureButton
            variant="alva"
            size="sm"
            className="w-auto flex-1"
            loading={isClaiming}
            onClick={() => {
              setTried(true);
              onClaim();
            }}
          >
            {tried && !isClaiming ? "Try again" : "Claim next session"}
          </TextureButton>
          <TextureButton
            variant="minimal"
            size="sm"
            className="w-auto"
            onClick={onCancel}
          >
            Back to queue
          </TextureButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
