import { useEffect, useState } from "react";
import TrashBinMinimalistic from "@solar-icons/react/ui/TrashBinMinimalistic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import { previewUserDeletion, type ApiUserDeletionSummary } from "@/lib/api/users";
import { reportApiError } from "@/lib/api/reportApiError";
import type { AdminUser } from "@/data/admin/users";

/** Only what is worth reading. A column of zeroes says nothing. */
const LINES: { key: keyof ApiUserDeletionSummary; label: string }[] = [
  { key: "recordings", label: "Recordings" },
  { key: "focus_group_sessions", label: "Focus group sessions" },
  { key: "participants", label: "Participants they logged" },
  { key: "annotations", label: "Annotations" },
  { key: "reviews", label: "Reviews they gave" },
  { key: "consent_records", label: "Consent records" },
  { key: "ledger_entries", label: "Earnings entries" },
];

/**
 * Deleting an account, with what that actually costs on screen first.
 *
 * `DELETE /users/{id}` is a hard delete: the person and everything that hangs
 * off them, gone, with no undo. The control for it was a bin icon that opened
 * a confirm pair with no words on it, so an admin could destroy a
 * contributor's year of recordings with two clicks and nothing telling them
 * what the second one did.
 *
 * `GET /users/{id}/deletion-preview` returns the same counts without removing
 * anything, and the API's own description says to call it first. "Delete Ada"
 * and "delete Ada and 118 recordings" are different decisions, and only one
 * of them was ever being put to anybody.
 *
 * Deactivating is the reversible alternative, so it is offered here rather
 * than left for somebody to remember.
 */
export function DeleteUserDialog({
  open,
  onOpenChange,
  user,
  onConfirm,
  onDeactivate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  onConfirm: () => void;
  onDeactivate: () => void;
}) {
  const [summary, setSummary] = useState<ApiUserDeletionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;

    let cancelled = false;
    setSummary(null);
    setError(null);

    previewUserDeletion(user.id)
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(reportApiError(cause, "Could not work out what this would remove."));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, user]);

  if (!user) return null;

  const lines = summary
    ? LINES.filter((line) => Number(summary[line.key] ?? 0) > 0)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="rounded-3xl border-alva-border bg-alva-card sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-foreground">
            <TrashBinMinimalistic
              size={20}
              weight="BoldDuotone"
              className="text-destructive"
            />
            Delete {user.fullName}?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            This removes the account and everything belonging to it. It cannot
            be undone.
          </p>

          {summary === null && !error ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Working out what this would remove…
            </p>
          ) : lines.length > 0 ? (
            <dl className="rounded-2xl bg-alva-surface px-4 py-3">
              <p className="text-xs text-muted-foreground">Deleted with them</p>
              <div className="mt-2 space-y-1">
                {lines.map((line) => (
                  <div
                    key={line.key}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <dt className="text-xs text-muted-foreground">{line.label}</dt>
                    <dd className="text-sm font-medium tabular-nums text-foreground">
                      {String(summary?.[line.key] ?? 0)}
                    </dd>
                  </div>
                ))}
              </div>
            </dl>
          ) : summary ? (
            <p className="text-xs text-muted-foreground">
              They have nothing on file yet, so only the account goes.
            </p>
          ) : null}

          {/* Kept on purpose by the API: money that moved has to stay on the
              record even once the person is gone. */}
          {summary?.payout_records_kept ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {summary.payout_records_kept} payout{" "}
              {summary.payout_records_kept === 1 ? "record is" : "records are"}{" "}
              kept without their name, because money that moved stays on the
              record.
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <TextureButton
              variant="minimal"
              size="sm"
              className="w-auto"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </TextureButton>

            {/* The reversible one, offered rather than left to be remembered. */}
            {user.isActive ? (
              <TextureButton
                variant="minimal"
                size="sm"
                className="w-auto"
                onClick={() => {
                  onDeactivate();
                  onOpenChange(false);
                }}
              >
                Deactivate instead
              </TextureButton>
            ) : null}

            <TextureButton
              variant="destructive"
              size="sm"
              className="w-auto"
              disabled={summary === null && !error}
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              Delete permanently
            </TextureButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
