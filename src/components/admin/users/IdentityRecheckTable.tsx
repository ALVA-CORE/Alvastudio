import MenuDots from "@solar-icons/react/ui/MenuDots";
import Letter from "@solar-icons/react/messages/Letter";
import CopyIcon from "@solar-icons/react/ui/Copy";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import ClockCircle from "@solar-icons/react/time/ClockCircle";
import { AlvaDataTable } from "@/components/shared/AlvaDataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useIdentityRecheck } from "@/hooks/useIdentityRecheck";
import type { ApiIdentityRecheckRow } from "@/lib/api/payouts";
import ShieldUser from "@solar-icons/react/security/ShieldUser";
import { alvaToast } from "@/lib/alva-toast";
import { cn } from "@/lib/utils";

/**
 * Who still has to redo their ID check, and whether they know.
 *
 * A table rather than the dialog this started as. The dialog could say "14
 * contributors" and list them in a scroll box, but this is a list an admin
 * comes back to — people drop off it as they submit documents, and the
 * question "has Ada been told, and has she done it" is a row lookup. That
 * wants sorting, searching and a row action, which is a table.
 *
 * Two states per person and they are not the same question. `notified` is
 * ours: did the mail go. Being *on the list at all* is theirs: the document
 * has not arrived. Somebody can be told and still not have done it, which is
 * the row an admin chases.
 *
 * Sending is still a single bulk action rather than per row, because the
 * route is: it mails everybody outstanding. The row menu offers the things
 * that are per person.
 */
/** The table keys every row by `id`; the API calls it `user_id`. */
type RecheckRow = ApiIdentityRecheckRow & { id: string };

export function IdentityRecheckTable({
  recheck,
}: {
  recheck: ReturnType<typeof useIdentityRecheck>;
}) {
  const { rows, untold, isLoading, isSending, error, apply, checkDelivery, confirming, setConfirming } =
    recheck;

  const tableRows: RecheckRow[] = rows.map((row) => ({ ...row, id: row.user_id }));

  const copyEmail = async (row: RecheckRow) => {
    try {
      await navigator.clipboard.writeText(row.email);
      alvaToast.success("Email copied");
    } catch {
      alvaToast.error("Could not copy, select it instead");
    }
  };

  const columns = [
    {
      key: "full_name",
      header: "Name",
      sortable: true,
      sortValue: (row: RecheckRow) => row.full_name,
      render: (row: RecheckRow) => (
        <span className="font-medium text-foreground">{row.full_name}</span>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      sortValue: (row: RecheckRow) => row.email,
      className: "max-w-0",
      render: (row: RecheckRow) => (
        <span className="block truncate text-muted-foreground">{row.email}</span>
      ),
    },
    {
      key: "notified",
      header: "Status",
      sortable: true,
      /* Untold first. They are the ones a send would reach, so they are the
         ones an admin opening this tab is here about. */
      sortValue: (row: RecheckRow) => (row.notified ? 1 : 0),
      render: (row: RecheckRow) => (
        <span
          className={cn(
            "flex items-center gap-1.5 text-sm",
            row.notified ? "text-muted-foreground" : "text-amber-300"
          )}
        >
          {row.notified ? (
            <CheckCircle size={13} weight="Bold" />
          ) : (
            <ClockCircle size={13} weight="Bold" />
          )}
          {row.notified ? "Told, waiting on them" : "Not told yet"}
        </span>
      ),
    },
  ];

  return (
    <>
      {error ? (
        <p
          role="alert"
          className="mb-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400"
        >
          {error}
        </p>
      ) : null}

      <AlvaDataTable
        title="Identity recheck"
        rows={tableRows}
        columns={columns}
        pageSize={10}
        isLoading={isLoading}
        searchPlaceholder="Search name or email"
        searchKeys={["full_name", "email"]}
        mobilePrimary={(row) => ({
          title: row.full_name,
          subtitle: row.notified ? "Told, waiting on them" : "Not told yet",
        })}
        renderRowActions={(row) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Actions for ${row.full_name}`}
                onClick={(event) => event.stopPropagation()}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-alva-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
              >
                <MenuDots size={16} weight="Bold" className="rotate-90" />
              </button>
            </DropdownMenuTrigger>

            {/* Two, and neither is "send to this one". The route mails
                everybody outstanding in one go, and a per-row send would be
                a button that quietly did something else. */}
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="gap-2" onSelect={() => void copyEmail(row)}>
                <CopyIcon size={15} weight="Outline" />
                Copy email
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => {
                  window.location.href = `mailto:${row.email}`;
                }}
              >
                <Letter size={15} weight="Outline" />
                Write to them
              </DropdownMenuItem>
              {/* "Told" only says the API queued one. This asks the delivery
                  record what the mail service actually did with it, which is
                  the difference this product has been bitten by before. */}
              <DropdownMenuItem
                className="gap-2"
                disabled={!row.notified}
                onSelect={() => void checkDelivery(row.user_id)}
              >
                <Letter size={15} weight="Outline" />
                Check delivery
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        )}
        emptyState={{
          icon: <ShieldUser size={18} weight="Outline" />,
          title: "Nobody needs this",
          description:
            "Every contributor whose check was reset has either sent a document or already been told.",
        }}
      />

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Email ${untold.length} ${untold.length === 1 ? "person" : "people"}?`}
        description="They get one email and a notification in the app, telling them their identity check needs redoing before their next withdrawal."
        /* Repeating this is safe, so the confirm is a plain one rather than
           a guarded one: nobody is mailed twice and the list is rechecked at
           send time. */
        detail="Nobody is emailed twice. Anyone who sends a document before this goes out drops off the list."
        confirmLabel="Send"
        onConfirm={() => void apply()}
        isPending={isSending}
      />
    </>
  );
}
