import { useRef, useState } from "react";
import MenuDots from "@solar-icons/react/ui/MenuDots";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import UserBlock from "@solar-icons/react/users/UserBlock";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import { AlvaDataTable } from "@/components/shared/AlvaDataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DecideFlagDialog } from "@/components/admin/users/DecideFlagDialog";
import { useDuplicateFlags } from "@/hooks/useDuplicateFlags";
import type { ApiDuplicateFlag } from "@/lib/api/payouts";
import type { AdminUser } from "@/data/admin/users";
import { relativeDays } from "@/data/admin/shared";
import { NO_VALUE } from "@/lib/no-value";

const KIND_LABEL: Record<string, string> = {
  identity_reuse: "Same NIN",
  destination_reuse: "Same bank account",
};

type FlagRow = ApiDuplicateFlag & {
  id: string;
  who: string;
  matched: string;
  kindLabel: string;
  flaggedLabel: string;
};

/**
 * Two accounts the API believes are one person.
 *
 * An open flag holds payouts on the newer account, so this is not a History
 * tab — every day a flag sits here is a day somebody is not being paid.
 * Until now there was no screen at all: the dashboard counted flags and
 * linked here, and here had nothing to link to.
 *
 * Only the newer account is held, which is deliberate on the API's side:
 * somebody typing a stranger's NIN cannot freeze the stranger's pay.
 *
 * Names rather than ids. The flag carries `user_id` and `matched_user_id`
 * and nothing readable, and an admin cannot decide anything about two UUIDs.
 */
export function DuplicateFlagsTable({
  active,
  users,
}: {
  active: boolean;
  /** The accounts list the page already has, for turning ids into names. */
  users: AdminUser[];
}) {
  const { flags, isLoading, isWorking, error, resolve, reload } =
    useDuplicateFlags(active);
  const [deciding, setDeciding] = useState<{ flag: FlagRow; uphold: boolean } | null>(
    null
  );

  /**
   * The dialog opens after the menu has closed, not during.
   *
   * Radix locks the page behind an open overlay with `pointer-events: none`
   * on `<body>`, and restores what it found when it closes. Opening the
   * dialog from inside `onSelect` means the dialog records the *menu's*
   * lock as the thing to restore — so when the dialog closes it writes
   * `none` back, and the whole page is dead to the mouse until a reload.
   * Only the sidebar stays clickable, because it sits in its own layer.
   *
   * `onCloseAutoFocus` fires once the menu has finished closing, which
   * makes this ordering deterministic rather than a race with a timer.
   */
  const pending = useRef<{ flag: FlagRow; uphold: boolean } | null>(null);

  const name = (id: string | null) => {
    if (!id) return NO_VALUE;
    const match = users.find((user) => user.id === id);
    return match ? match.fullName : `${id.slice(0, 8)}…`;
  };

  const rows: FlagRow[] = flags.map((flag) => ({
    ...flag,
    who: name(flag.user_id),
    matched: name(flag.matched_user_id),
    kindLabel: KIND_LABEL[flag.kind] ?? flag.kind.replace(/_/g, " "),
    flaggedLabel: relativeDays(new Date(flag.created_at)),
  }));

  const columns = [
    {
      key: "who",
      header: "Held account",
      sortable: true,
      sortValue: (row: FlagRow) => row.who,
      render: (row: FlagRow) => (
        <span className="font-medium text-foreground">{row.who}</span>
      ),
    },
    {
      key: "matched",
      header: "Matches",
      sortable: true,
      sortValue: (row: FlagRow) => row.matched,
      render: (row: FlagRow) => (
        <span className="text-muted-foreground">{row.matched}</span>
      ),
    },
    {
      key: "kindLabel",
      header: "Why",
      sortable: true,
      sortValue: (row: FlagRow) => row.kindLabel,
      render: (row: FlagRow) => (
        <span className="text-muted-foreground">{row.kindLabel}</span>
      ),
    },
    {
      key: "created_at",
      header: "Flagged",
      sortable: true,
      sortValue: (row: FlagRow) => new Date(row.created_at).getTime(),
      render: (row: FlagRow) => (
        <span className="tabular-nums text-muted-foreground">{row.flaggedLabel}</span>
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
        title="Duplicate accounts"
        rows={rows}
        columns={columns}
        pageSize={10}
        isLoading={isLoading}
        searchPlaceholder="Search a name"
        searchKeys={["who", "matched"]}
        mobilePrimary={(row) => ({
          title: row.who,
          subtitle: `${row.kindLabel} as ${row.matched}`,
        })}
        renderRowActions={(row) => (
          <div className="flex justify-end">
            <DropdownMenu
              onOpenChange={(open) => {
                if (!open) return;
                pending.current = null;
              }}
            >
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Decide the flag on ${row.who}`}
                  onClick={(event) => event.stopPropagation()}
                  className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-alva-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
                >
                  <MenuDots size={16} weight="Bold" className="rotate-90" />
                </button>
              </DropdownMenuTrigger>

              {/* Dismiss first, and it is the safe one: the hold comes off
                  and both accounts carry on. Upholding is destructive and
                  irreversible, so it sits second and in red. */}
              <DropdownMenuContent
                align="end"
                className="w-52"
                onCloseAutoFocus={(event) => {
                  if (!pending.current) return;
                  /* Focus would otherwise return to the trigger behind the
                     dialog that is about to open. */
                  event.preventDefault();
                  setDeciding(pending.current);
                  pending.current = null;
                }}
              >
                <DropdownMenuItem
                  className="gap-2"
                  onSelect={() => {
                    pending.current = { flag: row, uphold: false };
                  }}
                >
                  <CheckCircle size={15} weight="Outline" />
                  Not a duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-red-400 focus:text-red-400"
                  onSelect={() => {
                    pending.current = { flag: row, uphold: true };
                  }}
                >
                  <UserBlock size={15} weight="Outline" />
                  Close both accounts
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        emptyState={{
          icon: <UsersGroupRounded size={18} weight="Outline" />,
          title: "No accounts are flagged",
          description:
            "Nobody's payouts are being held for a duplicate right now.",
        }}
      />

      <DecideFlagDialog
        open={deciding !== null}
        onOpenChange={(next) => !next && setDeciding(null)}
        decision={deciding}
        isWorking={isWorking}
        onDecide={resolve}
        onDone={reload}
      />
    </>
  );
}
