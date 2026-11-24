import { useCallback, useEffect, useState } from "react";
import Letter from "@solar-icons/react/messages/Letter";
import { AlvaDataTable } from "@/components/shared/AlvaDataTable";
import { Input } from "@/components/ui/input";
import { alvaFieldClass } from "@/lib/alva-form-styles";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TextureButton } from "@/components/ui/texture-button";
import { relativeDays } from "@/data/admin/shared";
import { blockEmail, listBlockedEmails, unblockEmail, type ApiBlockedEmail } from "@/lib/api/users";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";

/**
 * Emails that can't be used to sign up. Only a hash is kept, so a row shows
 * the address masked, and finding one takes the full address.
 */
export function BlockedEmailsTable({ active }: { active: boolean }) {
  const [rows, setRows] = useState<ApiBlockedEmail[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<string | null>(null);
  const [isAdding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<ApiBlockedEmail | null>(null);

  const load = useCallback((address?: string) => {
    setLoading(true);
    listBlockedEmails(address)
      .then((page) => {
        setRows(page.items);
        setFound(address ?? null);
        setError(null);
      })
      .catch((cause: unknown) => setError(reportApiError(cause, "Could not load the block list.")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (active) load();
  }, [active, load]);

  const address = email.trim();

  const add = async () => {
    setAdding(true);
    try {
      await blockEmail(address);
      alvaToast.success("Email blocked");
      setEmail("");
      load();
    } catch (cause) {
      const message = reportApiError(cause, "Could not block that email.");
      if (message) alvaToast.error(message);
    } finally {
      setAdding(false);
    }
  };

  const columns = [
    {
      key: "hint",
      header: "Email",
      render: (row: ApiBlockedEmail) => <span className="font-medium text-foreground">{row.hint}</span>,
    },
    {
      key: "role",
      header: "Was",
      render: (row: ApiBlockedEmail) => (
        <span className="capitalize text-muted-foreground">{row.role ?? "Added by hand"}</span>
      ),
    },
    {
      key: "blocked_by_name",
      header: "Blocked by",
      render: (row: ApiBlockedEmail) => <span className="text-muted-foreground">{row.blocked_by_name ?? "—"}</span>,
    },
    {
      key: "created_at",
      header: "When",
      sortable: true,
      sortValue: (row: ApiBlockedEmail) => new Date(row.created_at).getTime(),
      render: (row: ApiBlockedEmail) => (
        <span className="tabular-nums text-muted-foreground">{relativeDays(new Date(row.created_at))}</span>
      ),
    },
  ];

  return (
    <>
      {/* One box: Find looks the address up, Block adds it. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          type="email"
          className={alvaFieldClass()}
          aria-label="Email address"
          placeholder="Full email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          wrapperClassName="min-w-[220px] flex-1"
        />
        <TextureButton variant="minimal" size="sm" className="w-auto" disabled={!address} onClick={() => load(address)}>
          Find
        </TextureButton>
        <TextureButton variant="alva" size="sm" className="w-auto" disabled={!address} loading={isAdding} onClick={() => void add()}>
          Block
        </TextureButton>
        {found ? (
          <TextureButton variant="minimal" size="sm" className="w-auto" onClick={() => load()}>
            Show all
          </TextureButton>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mb-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400">
          {error}
        </p>
      ) : null}

      <AlvaDataTable<ApiBlockedEmail>
        title="Blocked emails"
        rows={rows}
        columns={columns}
        pageSize={10}
        isLoading={isLoading}
        mobilePrimary={(row) => ({ title: row.hint, subtitle: row.role ?? "Added by hand" })}
        renderRowActions={(row) => (
          <div className="flex justify-end">
            <TextureButton
              variant="minimal"
              size="sm"
              className="w-auto"
              onClick={(event) => {
                event.stopPropagation();
                setRemoving(row);
              }}
            >
              Remove
            </TextureButton>
          </div>
        )}
        emptyState={{
          icon: <Letter size={18} weight="Outline" />,
          title: found ? "That email isn't blocked" : "No blocked emails",
          description: found ? found : "Emails blocked when an account is deleted show here.",
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => !next && setRemoving(null)}
        tone="default"
        title="Remove from the block list?"
        description={`${removing?.hint ?? "This email"} can sign up again straight away.`}
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!removing) return;
          try {
            await unblockEmail(removing.id);
            setRows((current) => current.filter((row) => row.id !== removing.id));
            alvaToast.success("Removed from the block list");
            setRemoving(null);
          } catch (cause) {
            const message = reportApiError(cause, "Could not remove it.");
            if (message) alvaToast.error(message);
          }
        }}
      />
    </>
  );
}
