import { useEffect, useState } from "react";
import KeyMinimalistic from "@solar-icons/react/security/KeyMinimalistic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import {
  approvePasswordResetRequest,
  denyPasswordResetRequest,
  listPasswordResetRequests,
  type ApiPasswordResetRequest,
} from "@/lib/api/users";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";
import { relativeDays } from "@/data/admin/shared";

/**
 * People who have asked for help getting back into their account.
 *
 * Recovery is not self-serve: somebody asks, an admin decides, and the API
 * emails the link on approval. Without this screen the requests arrived
 * nowhere and nobody was ever let back in.
 *
 * Approving sends the email; nothing is shown here to copy, because the link
 * is theirs and should reach them rather than pass through an admin.
 */
export function RecoveryRequestsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [requests, setRequests] = useState<ApiPasswordResetRequest[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setRequests(null);
    setError(null);

    listPasswordResetRequests()
      .then((rows) => {
        if (!cancelled) setRequests(rows);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load the requests."));
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const settle = async (
    request: ApiPasswordResetRequest,
    decision: "approve" | "deny"
  ) => {
    setBusy(request.id);
    setError(null);

    try {
      if (decision === "approve") {
        await approvePasswordResetRequest(request.id);
        alvaToast.success(`Reset link emailed to ${request.email}`);
      } else {
        await denyPasswordResetRequest(request.id);
        alvaToast.show(`Request from ${request.full_name} declined`, {
          variant: "default",
        });
      }

      setRequests((prev) => (prev ?? []).filter((row) => row.id !== request.id));
    } catch (cause) {
      setError(reportApiError(cause, "Could not do that.") ?? "Could not do that.");
    } finally {
      setBusy(null);
    }
  };

  const rows = requests ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="rounded-3xl border-alva-border bg-alva-card sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-foreground">
            <KeyMinimalistic
              size={20}
              weight="BoldDuotone"
              className="text-alva-accent"
            />
            Account recovery
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Approving emails them a link to set a new password. Check you know
            who asked before you do.
          </p>

          {requests === null ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Loading…
            </p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nobody is waiting.
            </p>
          ) : (
            <ul className="alva-thin-scrollbar max-h-[18rem] space-y-1.5 overflow-y-auto pr-1">
              {rows.map((request) => (
                <li
                  key={request.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-alva-surface px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {request.full_name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {request.email} · {relativeDays(new Date(request.requested_at))}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <TextureButton
                      variant="minimal"
                      size="sm"
                      className="w-auto"
                      disabled={busy !== null}
                      onClick={() => void settle(request, "deny")}
                    >
                      Decline
                    </TextureButton>
                    <TextureButton
                      variant="alva"
                      size="sm"
                      className="w-auto"
                      loading={busy === request.id}
                      disabled={busy !== null && busy !== request.id}
                      onClick={() => void settle(request, "approve")}
                    >
                      Approve
                    </TextureButton>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
