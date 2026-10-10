import { useEffect, useState } from "react";
import CopyIcon from "@solar-icons/react/ui/Copy";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import { alvaToast } from "@/lib/alva-toast";
import { cn } from "@/lib/utils";

/**
 * Hands over a password reset token.
 *
 * An admin cannot set someone's password, by design: an admin who could would
 * be able to sign in as anyone, including another admin, with nothing in the
 * record to show it happened. `POST /users/{id}/password-reset` returns a
 * single-use token instead, which the admin passes to the person out of band;
 * they redeem it themselves and choose their own password.
 *
 * So this is a handover, not a confirmation. The panel used to say "Reset link
 * sent to <email>", which was wrong twice over: nothing is sent, and waiting
 * for an email that never arrives is a worse failure than no reset at all.
 *
 * The token is shown once. There is no second copy to fetch, which is why the
 * dialog says so rather than letting someone close it and come looking.
 */
export function PasswordResetDialog({
  open,
  onOpenChange,
  fullName,
  token,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fullName: string;
  /** Null while the request is in flight. */
  token: string | null;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const copy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      alvaToast.success("Token copied");
    } catch {
      // Blocked clipboard, usually an insecure origin. The token is on screen
      // either way, so this is an inconvenience rather than a failure.
      alvaToast.error("Could not copy, select the token instead");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-alva-border bg-alva-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Reset token for {fullName}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Send this to them yourself. They set their own password with it, and
            it works once.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-alva-surface p-3">
          <p
            className={cn(
              "break-all font-mono text-sm text-foreground",
              !token && "animate-pulse text-muted-foreground"
            )}
          >
            {token ?? "Generating…"}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          This is the only time it is shown. Close this and you will have to
          generate another.
        </p>

        <div className="flex gap-2">
          <TextureButton
            variant="alva"
            size="sm"
            className="w-auto"
            disabled={!token}
            onClick={copy}
          >
            {copied ? (
              <CheckCircle size={15} weight="Outline" />
            ) : (
              <CopyIcon size={15} weight="Outline" />
            )}
            {copied ? "Copied" : "Copy token"}
          </TextureButton>

          <TextureButton
            variant="minimal"
            size="sm"
            className="w-auto"
            onClick={() => onOpenChange(false)}
          >
            Done
          </TextureButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
