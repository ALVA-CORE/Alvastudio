import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Plain from "@solar-icons/react/messages/Plain";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import UserCheck from "@solar-icons/react/users/UserCheck";
import { BeamInput } from "@/components/auth/BeamInput";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TextureButton } from "@/components/ui/texture-button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Chip } from "@/components/admin/communications/RecipientsField";
import { PanelHeader } from "@/components/admin/communications/PanelHeader";
import {
  useAnnouncementComposer,
  useSentAnnouncements,
  type AnnouncementForm,
} from "@/hooks/useAnnouncements";
import { ANNOUNCEMENT_LIMITS, type ApiAnnouncement } from "@/lib/api/announcements";
import type { ApiUserRole } from "@/lib/api/enums";
import { ApiError } from "@/lib/api/client";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";
import { relativeDays } from "@/data/admin/shared";
import { cn } from "@/lib/utils";

type Tab = "compose" | "sent";

const TABS: { id: Tab; label: string }[] = [
  { id: "compose", label: "Compose" },
  { id: "sent", label: "Sent" },
];

const ROLES: { value: ApiUserRole; label: string }[] = [
  { value: "contributor", label: "Contributors" },
  { value: "intern", label: "Interns" },
  { value: "annotator", label: "Annotators" },
  { value: "admin", label: "Admins" },
];

const APPROVAL: { value: AnnouncementForm["approved"]; label: string }[] = [
  { value: "any", label: "Anyone" },
  { value: "approved", label: "Approved" },
  { value: "waiting", label: "Waiting" },
];

/**
 * An announcement, in the message panel beside email: same panel, same
 * fields, same two presses to send. Who it reaches sits where email's To is.
 */
export function AnnouncementPanel({
  composer,
  onClose,
}: {
  composer: ReturnType<typeof useAnnouncementComposer>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("compose");
  const [sentVersion, setSentVersion] = useState(0);
  const { fields, set, stage } = composer;
  const confirming = stage.kind === "confirm";
  const busy = stage.kind === "saving" || stage.kind === "sending";

  const press = async () => {
    try {
      if (!confirming) {
        await composer.prepare();
        return;
      }
      const sent = await composer.send();
      if (!sent) return;
      alvaToast.success(`Sent to ${sent.recipient_count.toLocaleString()}`);
      setSentVersion((value) => value + 1);
      setTab("sent");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404 && !cause.isUnreachable) {
        alvaToast.error("That announcement no longer exists.");
        return;
      }
      const message = reportApiError(cause, "Could not send that.");
      if (message) alvaToast.error(message);
    }
  };

  return (
    <>
      <PanelHeader<Tab> tabs={TABS} value={tab} onChange={setTab} onClose={onClose} />

      <div className="relative min-h-0 flex-1">
        <div className="alva-thin-scrollbar absolute inset-0 overflow-y-auto px-4 pb-4 pt-2">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
            >
              {tab === "compose" ? <Compose fields={fields} set={set} /> : <Sent version={sentVersion} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {tab === "compose" ? (
          <motion.footer
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 overflow-hidden border-t border-alva-border"
          >
            {/* What the backend asks to be said before it goes. */}
            {confirming ? (
              <p className="px-4 pt-3 text-xs text-muted-foreground">
                People who join later won't get it, and it can't be changed once sent.
              </p>
            ) : null}
            <div className="flex items-center gap-2 px-4 py-3">
              {confirming ? (
                <button
                  type="button"
                  onClick={composer.cancel}
                  className="whitespace-nowrap rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cancel
                </button>
              ) : null}
              <TextureButton
                variant="alva"
                size="default"
                className="flex-1"
                loading={busy}
                disabled={Boolean(composer.problem)}
                title={composer.problem ?? undefined}
                onClick={() => void press()}
              >
                <span className="tabular-nums">
                  {confirming ? `Send to ${stage.count.toLocaleString()}` : "Send"}
                </span>
                <Plain size={16} weight="Bold" />
              </TextureButton>
            </div>
          </motion.footer>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function Compose({
  fields,
  set,
}: {
  fields: AnnouncementForm;
  set: ReturnType<typeof useAnnouncementComposer>["set"];
}) {
  const toggleRole = (role: ApiUserRole) =>
    set(
      "roles",
      fields.roles.includes(role) ? fields.roles.filter((value) => value !== role) : [...fields.roles, role]
    );

  return (
    <div className="space-y-3">
      {/* As email's To and Header: label and field on a line, hairlines
          between, no boxes. */}
      <div className="divide-y divide-alva-border border-b border-alva-border">
        <div className="grid grid-cols-2 divide-x divide-alva-border">
          <PickField label="Roles" empty="Everyone">
            {{
              chips: fields.roles.map((role) => (
                <Chip
                  key={role}
                  icon={<UsersGroupRounded size={13} weight="Bold" />}
                  onRemove={() => toggleRole(role)}
                >
                  {ROLES.find((option) => option.value === role)?.label}
                </Chip>
              )),
              menu: ROLES.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={fields.roles.includes(option.value)}
                  onCheckedChange={() => toggleRole(option.value)}
                  onSelect={(event) => event.preventDefault()}
                  className="rounded-xl"
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              )),
            }}
          </PickField>
          <PickField label="Approved" empty="Anyone" className="pl-3">
            {{
              chips:
                fields.approved === "any"
                  ? []
                  : [
                      <Chip
                        key="approved"
                        icon={<UserCheck size={13} weight="Bold" />}
                        onRemove={() => set("approved", "any")}
                      >
                        {APPROVAL.find((option) => option.value === fields.approved)?.label}
                      </Chip>,
                    ],
              menu: APPROVAL.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={fields.approved === option.value}
                  onCheckedChange={() => set("approved", option.value)}
                  className="rounded-xl"
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              )),
            }}
          </PickField>
        </div>

        <input
          aria-label="Title"
          placeholder="Title"
          value={fields.title}
          maxLength={ANNOUNCEMENT_LIMITS.title}
          onChange={(event) => set("title", event.target.value.replace(/\n/g, " "))}
          className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      <textarea
        aria-label="Message"
        placeholder="Message"
        rows={8}
        value={fields.body}
        maxLength={ANNOUNCEMENT_LIMITS.body}
        onChange={(event) => set("body", event.target.value)}
        className="w-full resize-none rounded-xl border border-alva-border bg-alva-surface px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />

      <div className="grid grid-cols-[2fr_3fr] gap-2">
        <BeamInput
          label="Button"
          value={fields.actionLabel}
          maxLength={ANNOUNCEMENT_LIMITS.actionLabel}
          onChange={(event) => set("actionLabel", event.target.value)}
        />
        <BeamInput
          label="Link"
          inputMode="url"
          value={fields.actionUrl}
          maxLength={ANNOUNCEMENT_LIMITS.actionUrl}
          onChange={(event) => set("actionUrl", event.target.value)}
        />
      </div>
    </div>
  );
}

/** A To-style field: its label, what is chosen as chips, and a menu to choose. */
function PickField({
  label,
  empty,
  className,
  children,
}: {
  label: string;
  empty: string;
  className?: string;
  children: { chips: ReactNode[]; menu: ReactNode };
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          aria-label={label}
          className={cn(
            "flex min-h-12 cursor-pointer flex-wrap items-center gap-1.5 py-2 focus-visible:outline-none",
            className
          )}
        >
          <span className="mr-1 text-sm text-muted-foreground">{label}</span>
          {children.chips.length ? (
            /* Removing a chip must not open the menu. */
            <span className="contents" onPointerDown={(event) => event.stopPropagation()}>
              <AnimatePresence initial={false}>{children.chips}</AnimatePresence>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground/60">{empty}</span>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 rounded-2xl border-alva-border bg-alva-card p-1.5">
        {children.menu}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Sent({ version }: { version: number }) {
  const { rows, withdraw } = useSentAnnouncements(version);
  const [withdrawing, setWithdrawing] = useState<ApiAnnouncement | null>(null);
  const [pending, setPending] = useState(false);

  if (rows === null) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-12 animate-pulse rounded-2xl bg-alva-surface" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Nothing sent yet</p>;
  }

  return (
    <>
      <ul className="divide-y divide-alva-border/70">
        {rows.map((row) => {
          const live = row.status === "sent";
          return (
            <li key={row.id}>
              <button
                type="button"
                disabled={row.status === "withdrawn"}
                onClick={() => setWithdrawing(row)}
                className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-alva-surface/60 disabled:cursor-default disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-alva-accent"
              >
                <span className={cn("size-2 shrink-0 rounded-full", live ? "bg-alva-accent" : "bg-muted-foreground/40")} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground">{row.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {relativeDays(new Date(row.sent_at ?? row.updated_at))}
                    {live ? "" : row.status === "expired" ? " · Expired" : " · Withdrawn"}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  Read by {row.read_count.toLocaleString()} of {row.recipient_count.toLocaleString()}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={withdrawing !== null}
        onOpenChange={(next) => !next && setWithdrawing(null)}
        title="Withdraw this announcement?"
        description="It leaves everyone's notifications, read or not. It can't be sent again."
        confirmLabel="Withdraw"
        isPending={pending}
        onConfirm={async () => {
          if (!withdrawing) return;
          setPending(true);
          try {
            await withdraw(withdrawing.id);
            alvaToast.success("Withdrawn");
          } catch (cause) {
            const message = reportApiError(cause, "Could not withdraw that.");
            if (message) alvaToast.error(message);
          } finally {
            setPending(false);
            setWithdrawing(null);
          }
        }}
      />
    </>
  );
}
