import { useState } from "react";
import KeyMinimalistic from "@solar-icons/react/security/KeyMinimalistic";
import { AlvaDataTable } from "@/components/shared/AlvaDataTable";
import { TextureButton } from "@/components/ui/texture-button";
import { alvaToast } from "@/lib/alva-toast";
import { reportApiError } from "@/lib/api/reportApiError";
import type {
  RecoveryRequest,
  ResetLinkOutcome,
} from "@/hooks/useRecoveryRequests";

/**
 * People waiting to be let back into their account.
 *
 * A table rather than a dialog, beside Accounts, because this is a queue
 * somebody works rather than a thing they check: it has to be visible from
 * the page, sortable and searchable like every other list on the surface.
 *
 * Approving emails them the link. Nothing is shown here to copy: the link is
 * theirs, and routing it through an admin's clipboard would make an admin a
 * second way into somebody else's account.
 *
 * What the toast says comes from `GET /users/{id}/emails`, not from the 200.
 * The approve call answering 200 only means a token was minted; for three
 * weeks the mail behind it was being refused while this screen said the link
 * had been emailed, and the person it was about sat waiting for it.
 */
/**
 * `sent` is the mail service accepting it, which is not proof of an inbox,
 * so the wording stops at what is known. A refusal gets the manual reset
 * named in the same breath: an admin who has just been told the email failed
 * needs the next step, not an apology.
 */
function announce(outcome: ResetLinkOutcome, email: string) {
  if (outcome === "sent") {
    return alvaToast.success(`Reset link sent to ${email}`);
  }

  if (outcome === "failed") {
    return alvaToast.error(
      `Approved, but the email to ${email} was refused. Use Reset password on their account to hand them a link.`
    );
  }

  if (outcome === "pending") {
    return alvaToast.show(`Approved. The email to ${email} is still queued.`, {
      variant: "default",
    });
  }

  if (outcome === "skipped") {
    return alvaToast.show(`Approved. No email was needed.`, { variant: "default" });
  }

  /* The approval went through and we could not read what became of the mail. */
  return alvaToast.show(`Approved. Could not confirm the email to ${email}.`, {
    variant: "default",
  });
}

export function RecoveryRequestsTable({
  rows,
  isLoading,
  error,
  reload,
  approve,
  deny,
}: {
  rows: RecoveryRequest[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  approve: (id: string, userId: string) => Promise<ResetLinkOutcome>;
  deny: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const settle = async (request: RecoveryRequest, decision: "approve" | "deny") => {
    setBusy(request.id);

    try {
      if (decision === "approve") {
        const outcome = await approve(request.id, request.userId);
        announce(outcome, request.email);
      } else {
        await deny(request.id);
        alvaToast.show(`Request from ${request.name} declined`, {
          variant: "default",
        });
      }
    } catch (cause) {
      const message = reportApiError(cause, "Could not do that.");
      if (message) alvaToast.error(message);
    } finally {
      setBusy(null);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      sortValue: (row: RecoveryRequest) => row.name,
      render: (row: RecoveryRequest) => (
        <span className="font-medium text-foreground">{row.name}</span>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortValue: (row: RecoveryRequest) => row.email,
      render: (row: RecoveryRequest) => (
        <span className="text-muted-foreground">{row.email}</span>
      ),
    },
    {
      key: "requestedAt",
      header: "Waiting",
      sortValue: (row: RecoveryRequest) => row.requestedAt,
      render: (row: RecoveryRequest) => (
        <span className="tabular-nums text-muted-foreground">
          {row.requestedLabel}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row: RecoveryRequest) => (
        <div
          className="flex items-center justify-end gap-2"
          /* The row itself opens nothing, but the table still bubbles a
             click, and a stray Approve is somebody's account. */
          onClick={(event) => event.stopPropagation()}
        >
          <TextureButton
            variant="minimal"
            size="sm"
            className="w-auto"
            disabled={busy !== null}
            onClick={() => void settle(row, "deny")}
          >
            Decline
          </TextureButton>
          <TextureButton
            variant="alva"
            size="sm"
            className="w-auto"
            loading={busy === row.id}
            disabled={busy !== null && busy !== row.id}
            onClick={() => void settle(row, "approve")}
          >
            Approve
          </TextureButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      {error ? (
        <div
          role="alert"
          className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400"
        >
          {error}
          <button
            type="button"
            onClick={reload}
            className="shrink-0 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            Retry
          </button>
        </div>
      ) : null}

      <AlvaDataTable
        title="Waiting to get back in"
        rows={isLoading ? [] : rows}
        columns={columns}
        pageSize={10}
        searchPlaceholder="Search name or email"
        searchKeys={["name", "email"]}
        mobilePrimary={(row: RecoveryRequest) => ({
          title: row.name,
          subtitle: `${row.email} · ${row.requestedLabel}`,
        })}
        emptyState={{
          icon: <KeyMinimalistic size={20} weight="Outline" />,
          title: "Nobody is waiting",
          description:
            "Requests appear here when somebody asks for help getting back into their account.",
        }}
      />
    </div>
  );
}
