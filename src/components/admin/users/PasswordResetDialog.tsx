import { useEffect, useState } from "react";
import CopyIcon from "@solar-icons/react/ui/Copy";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import Letter from "@solar-icons/react/messages/Letter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import { alvaToast } from "@/lib/alva-toast";
import { issuePasswordReset, listUserEmails } from "@/lib/api/users";
import { reportApiError } from "@/lib/api/reportApiError";
import { cn } from "@/lib/utils";

type Stage =
  | { kind: "confirm" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "queued" }
  /** Mail could not go out. The token is the only way left in. */
  | { kind: "undelivered"; token: string; reason: string }
  | { kind: "failed"; reason: string };

/**
 * Sends somebody a link to set a new password.
 *
 * This used to print the reset token in a box for the admin to copy and pass
 * on themselves. That was built when the mail provider was refusing every
 * send, and it stopped making sense the moment mail worked: it asks an admin
 * to find a private channel to each locked-out person and paste a secret into
 * it, which is slow, unauditable, and teaches people that credentials arrive
 * over WhatsApp.
 *
 * `POST /users/{id}/password-reset` queues the email itself. So the normal
 * path is now: confirm, send, and say whether it went.
 *
 * **The token still appears, but only when the email did not.** An admin
 * whose mail is down and who is shown nothing has a locked-out colleague and
 * no way to help them. It is the exception, it says why it is there, and it
 * is never the first thing offered.
 *
 * An admin still cannot set a password. That has not changed and must not:
 * an admin who could would be able to sign in as anyone, including another
 * admin, with nothing in the record to show it happened.
 */
export function PasswordResetDialog({
  open,
  onOpenChange,
  userId,
  fullName,
  email,
  existingToken,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  fullName: string;
  email: string;
  /**
   * A token already in hand, from creating the account.
   *
   * `POST /users` mints one and queues the invitation itself, so that flow
   * must not issue a second: a new token expires the first, and the link
   * already in their inbox would stop working.
   */
  existingToken?: string | null;
}) {
  const [stage, setStage] = useState<Stage>({ kind: "confirm" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCopied(false);

    /* Invited rather than reset: the mail is already away, so there is
       nothing to confirm and the only question is whether it arrived. */
    if (existingToken) {
      setStage({ kind: "sending" });
      void confirmDelivery(existingToken);
      return;
    }

    setStage({ kind: "confirm" });
    /* `confirmDelivery` is stable enough for this: it closes over `userId`,
       which is in the dependency list. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId, existingToken]);

  /**
   * Whether the mail actually went.
   *
   * A 200 from either route means a token was minted, not that anything
   * reached anybody. `GET /users/{id}/emails` is the only thing that knows
   * which, and for three weeks this screen said "sent" while every message
   * was being refused.
   */
  const confirmDelivery = async (token: string) => {
    try {
      const page = await listUserEmails(userId, { limit: 5 });
      const link = page.items.find(
        (row) => row.kind === "reset_link" || row.kind === "set_password"
      );

      if (link?.status === "sent") {
        setStage({ kind: "sent" });
        alvaToast.success(`Reset link sent to ${email}`);
        return;
      }
      if (link?.status === "pending") {
        setStage({ kind: "queued" });
        return;
      }

      setStage({
        kind: "undelivered",
        token,
        reason:
          link?.error ??
          "No email went out, so nothing has reached them yet.",
      });
    } catch {
      /* We could not read the delivery record. The send may well have worked,
         so this does not claim it failed — but the token is offered, because
         an admin who cannot tell should not be left with nothing. */
      setStage({
        kind: "undelivered",
        token,
        reason: "Could not confirm whether the email went out.",
      });
    }
  };

  const send = async () => {
    setStage({ kind: "sending" });

    try {
      const { token } = await issuePasswordReset(userId);
      await confirmDelivery(token);
    } catch (cause) {
      setStage({
        kind: "failed",
        reason: reportApiError(cause, "Could not issue a reset.") ?? "",
      });
    }
  };

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      alvaToast.success("Token copied");
    } catch {
      alvaToast.error("Could not copy, select the token instead");
    }
  };

  const title =
    stage.kind === "sent" || stage.kind === "queued"
      ? (existingToken ? "Invitation sent" : "Link sent")
      : stage.kind === "undelivered"
        ? "The email did not go out"
        : existingToken
          ? `Setting up ${fullName}`
          : `Reset ${fullName}'s password?`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-alva-border bg-alva-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {stage.kind === "sent"
              ? `${email} can now set a new password. The link works once.`
              : stage.kind === "queued"
                ? `The email to ${email} is queued and will go out shortly.`
                : stage.kind === "undelivered"
                  ? "Pass this token to them yourself. They set their own password with it, and it works once."
                  : `We will email ${email} a link to set a new password. Their current one keeps working until they use it.`}
          </DialogDescription>
        </DialogHeader>

        {stage.kind === "undelivered" ? (
          <>
            <p role="alert" className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-300">
              {stage.reason}
            </p>

            <div className="rounded-xl bg-alva-surface p-3">
              <p className="break-all font-mono text-sm text-foreground">
                {stage.token}
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              This is the only time it is shown. Close this and you will have to
              issue another.
            </p>
          </>
        ) : null}

        {stage.kind === "failed" ? (
          <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">
            {stage.reason}
          </p>
        ) : null}

        <div className="flex gap-2">
          {stage.kind === "confirm" || stage.kind === "sending" ? (
            <>
              <TextureButton
                variant="alva"
                size="sm"
                className="w-auto"
                loading={stage.kind === "sending"}
                onClick={() => void send()}
              >
                <Letter size={15} weight="Outline" />
                Send reset link
              </TextureButton>
              <TextureButton
                variant="minimal"
                size="sm"
                className="w-auto"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </TextureButton>
            </>
          ) : null}

          {stage.kind === "undelivered" ? (
            <TextureButton
              variant="alva"
              size="sm"
              className="w-auto"
              onClick={() => void copy(stage.token)}
            >
              {copied ? (
                <CheckCircle size={15} weight="Outline" />
              ) : (
                <CopyIcon size={15} weight="Outline" />
              )}
              {copied ? "Copied" : "Copy token"}
            </TextureButton>
          ) : null}

          {stage.kind !== "confirm" && stage.kind !== "sending" ? (
            <TextureButton
              variant={stage.kind === "undelivered" ? "minimal" : "alva"}
              size="sm"
              className={cn("w-auto")}
              onClick={() => onOpenChange(false)}
            >
              Done
            </TextureButton>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
