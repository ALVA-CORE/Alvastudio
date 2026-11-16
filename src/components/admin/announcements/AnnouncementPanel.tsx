import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Plain from "@solar-icons/react/messages/Plain";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import UserCheck from "@solar-icons/react/users/UserCheck";
import ShieldCheck from "@solar-icons/react/security/ShieldCheck";
import Letter from "@solar-icons/react/messages/Letter";
import TrashBinMinimalistic from "@solar-icons/react/ui/TrashBinMinimalistic";
import DocumentText from "@solar-icons/react/notes/DocumentText";
import Bell from "@solar-icons/react/notifications/Bell";
import { AlvaEmptyState } from "@/components/shared/states/AlvaEmptyState";
import type { DirectoryPerson } from "@/hooks/usePeopleDirectory";
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
  parseEmails,
  people,
  toAudience,
  useAnnouncementComposer,
  useAnnouncementList,
  useAudiencePreview,
  type AnnouncementForm,
} from "@/hooks/useAnnouncements";
import {
  ANNOUNCEMENT_LIMITS,
  deleteAnnouncement,
  withdrawAnnouncement,
  type ApiAnnouncement,
} from "@/lib/api/announcements";
import type { ApiUserRole } from "@/lib/api/enums";
import type { ApiIdentityStatus } from "@/lib/api/wallet";
import { ApiError } from "@/lib/api/client";
import { reportApiError } from "@/lib/api/reportApiError";
import { alvaToast } from "@/lib/alva-toast";
import { relativeDays } from "@/data/admin/shared";
import { cn } from "@/lib/utils";

type Tab = "compose" | "drafts" | "sent";

const TABS: { id: Tab; label: string }[] = [
  { id: "compose", label: "Compose" },
  { id: "drafts", label: "Drafts" },
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

/* Every wallet identity state; a new one fails to compile until labelled. */
const IDENTITY: Record<ApiIdentityStatus, string> = {
  not_started: "Not started",
  link_created: "Started",
  submitted: "Submitted",
  passed: "Passed",
  failed: "Failed",
  unavailable: "Unavailable",
};

/** The error the API gave, in its words; a gone announcement says so. */
function report(cause: unknown, fallback: string) {
  if (cause instanceof ApiError && cause.status === 404 && !cause.isUnreachable) {
    alvaToast.error("That announcement no longer exists.");
    return;
  }
  const message = reportApiError(cause, fallback);
  if (message) alvaToast.error(message);
}

/**
 * An announcement, in the message panel beside email: same panel, same
 * fields, same two presses to send. Who it reaches sits where email's To is.
 */
export function AnnouncementPanel({
  composer,
  directory,
  onClose,
}: {
  composer: ReturnType<typeof useAnnouncementComposer>;
  /** Everyone the email To field can reach, for suggestions. */
  directory: DirectoryPerson[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("compose");
  /* Bumped after a write, so Drafts and Sent read again. */
  const [version, setVersion] = useState(0);
  const { fields, set, stage } = composer;
  const confirming = stage.kind === "confirm";
  const busy = stage.kind === "saving" || stage.kind === "sending";
  const problem = Object.values(composer.problems)[0] ?? null;

  const audience = useMemo(() => toAudience(fields), [fields]);
  const preview = useAudiencePreview(audience, tab === "compose");

  const press = async () => {
    try {
      if (!confirming) {
        await composer.prepare();
        return;
      }
      const sent = await composer.send();
      if (!sent) return;
      alvaToast.success(`Sent to ${people(sent.recipient_count)}`);
      setTab("sent");
    } catch (cause) {
      report(cause, "Could not send that.");
    } finally {
      setVersion((value) => value + 1);
    }
  };

  const saveDraft = async () => {
    try {
      await composer.saveDraft();
      alvaToast.success("Draft saved");
    } catch (cause) {
      report(cause, "Could not save that.");
    } finally {
      setVersion((value) => value + 1);
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
              {tab === "compose" ? (
                <Compose
                  fields={fields}
                  set={set}
                  directory={directory}
                  reach={preview.preview?.recipient_count ?? null}
                  unmatched={preview.preview?.unmatched_emails ?? []}
                />
              ) : (
                <List
                  status={tab === "drafts" ? "draft" : "sent"}
                  version={version}
                  onEdit={(row) => {
                    composer.edit(row);
                    setTab("compose");
                  }}
                  onChanged={() => setVersion((value) => value + 1)}
                />
              )}
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
                People who join later will not get it, and it cannot be edited once sent.
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
              ) : (
                <TextureButton
                  variant="minimal"
                  size="default"
                  className="w-auto shrink-0"
                  loading={stage.kind === "saving" && !confirming}
                  disabled={Boolean(problem) || busy}
                  onClick={() => void saveDraft()}
                >
                  Save draft
                </TextureButton>
              )}
              <TextureButton
                variant="alva"
                size="default"
                className="flex-1"
                loading={busy}
                disabled={Boolean(problem)}
                title={problem ?? undefined}
                onClick={() => void press()}
              >
                <span className="tabular-nums">
                  {confirming ? `Send to ${people(stage.count)}` : "Send"}
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

type Set_ = ReturnType<typeof useAnnouncementComposer>["set"];

function Compose({
  fields,
  set,
  directory,
  reach,
  unmatched,
}: {
  fields: AnnouncementForm;
  set: Set_;
  directory: DirectoryPerson[];
  /** Who it reaches now, or null while counting. */
  reach: number | null;
  /** Typed addresses with no active account: skipped at sending. */
  unmatched: string[];
}) {
  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  const emails = parseEmails(fields.emails);

  return (
    <div className="space-y-3">
      {/* As email's To and Header: label and field on a line, no boxes.
          Who it reaches on one line, each with its own underline, and short
          dividers between that stop clear of the lines. */}
      <div>
      <div className="flex items-stretch gap-3">
          <PickField
            label="Roles"
            empty="Everyone"
            className="min-w-0 flex-1 border-b border-alva-border"
            chips={fields.roles.map((role) => (
              <Chip
                key={role}
                icon={<UsersGroupRounded size={13} weight="Bold" />}
                onRemove={() => set("roles", toggle(fields.roles, role))}
              >
                {ROLES.find((option) => option.value === role)?.label}
              </Chip>
            ))}
            menu={ROLES.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={fields.roles.includes(option.value)}
                onCheckedChange={() => set("roles", toggle(fields.roles, option.value))}
                onSelect={(event) => event.preventDefault()}
                className="rounded-xl"
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          />
          <span aria-hidden className="my-3 w-px shrink-0 bg-alva-border" />
          <PickField
            label="Approved"
            empty="Anyone"
            className="min-w-0 flex-1 border-b border-alva-border"
            chips={
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
                  ]
            }
            menu={APPROVAL.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={fields.approved === option.value}
                onCheckedChange={() => set("approved", option.value)}
                className="rounded-xl"
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          />
          <span aria-hidden className="my-3 w-px shrink-0 bg-alva-border" />
          <PickField
            label="Identity"
            empty="Any"
            className="min-w-0 flex-1 border-b border-alva-border"
            chips={fields.identityStatus.map((status) => (
              <Chip
                key={status}
                icon={<ShieldCheck size={13} weight="Bold" />}
                onRemove={() => set("identityStatus", toggle(fields.identityStatus, status))}
              >
                {IDENTITY[status]}
              </Chip>
            ))}
            menu={(Object.keys(IDENTITY) as ApiIdentityStatus[]).map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={fields.identityStatus.includes(status)}
                onCheckedChange={() => set("identityStatus", toggle(fields.identityStatus, status))}
                onSelect={(event) => event.preventDefault()}
                className="rounded-xl"
              >
                {IDENTITY[status]}
              </DropdownMenuCheckboxItem>
            ))}
          />
      </div>

      <div className="divide-y divide-alva-border border-b border-alva-border">
        <EmailsField
          emails={emails}
          unmatched={unmatched}
          chosen={fields.userIds.length}
          directory={directory}
          onChange={(next) => set("emails", next.join("\n"))}
          onClearChosen={() => set("userIds", [])}
        />

        <input
          aria-label="Title"
          placeholder="Title"
          value={fields.title}
          maxLength={ANNOUNCEMENT_LIMITS.title}
          onChange={(event) => set("title", event.target.value.replace(/\n/g, " "))}
          className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
      </div>

      <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
        {reach === null ? "Counting…" : `This reaches ${people(reach)}.`}
      </p>

      <textarea
        aria-label="Message"
        placeholder="Message"
        rows={7}
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

      <BeamInput
        label="Ends"
        type="datetime-local"
        labelLifted
        value={fields.expiresAt}
        onChange={(event) => set("expiresAt", event.target.value)}
      />
    </div>
  );
}

/** A To-style field: its label, what is chosen as chips, and a menu to choose. */
function PickField({
  label,
  empty,
  chips,
  menu,
  className,
}: {
  label: string;
  empty: string;
  chips: ReactNode[];
  menu: ReactNode;
  className?: string;
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
          {chips.length ? (
            /* Removing a chip must not open the menu. */
            <span className="contents" onPointerDown={(event) => event.stopPropagation()}>
              <AnimatePresence initial={false}>{chips}</AnimatePresence>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground/60">{empty}</span>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 rounded-2xl border-alva-border bg-alva-card p-1.5">
        {menu}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * People by address, as email's To takes them: typed, with suggestions from
 * everyone in the studio, or pasted with commas. Each becomes a chip; one
 * with no account turns red and is skipped at sending. People a draft chose
 * by id show as one chip, kept unless removed.
 */
function EmailsField({
  emails,
  unmatched,
  chosen,
  directory,
  onChange,
  onClearChosen,
}: {
  emails: string[];
  unmatched: string[];
  chosen: number;
  directory: DirectoryPerson[];
  onChange: (emails: string[]) => void;
  onClearChosen: () => void;
}) {
  const [typing, setTyping] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const add = (more: string[]) => {
    if (more.length) onChange([...new Set([...emails, ...more])]);
    setTyping("");
    setActive(0);
  };

  /* Like To: names and addresses that match what is typed, not yet chosen. */
  const query = typing.trim().toLowerCase();
  const suggestions = query
    ? directory
        .filter(
          (person) =>
            !emails.includes(person.email.toLowerCase()) &&
            (person.name.toLowerCase().includes(query) || person.email.toLowerCase().includes(query))
        )
        .slice(0, 8)
    : [];

  return (
    <div className="relative">
      <div className="flex min-h-12 flex-wrap items-center gap-1.5 py-2">
        <span className="mr-1 text-sm text-muted-foreground">Emails</span>
        <AnimatePresence initial={false}>
          {chosen ? (
            <Chip key="chosen" icon={<UsersGroupRounded size={13} weight="Bold" />} onRemove={onClearChosen}>
              {people(chosen)}
            </Chip>
          ) : null}
          {emails.map((email) => (
            <Chip
              key={email}
              icon={<Letter size={13} weight="Bold" />}
              onRemove={() => onChange(emails.filter((value) => value !== email))}
            >
              <span className={cn(unmatched.includes(email) && "text-destructive")}>{email}</span>
            </Chip>
          ))}
        </AnimatePresence>
        <input
          aria-label="Emails"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls="announcement-emails"
          aria-autocomplete="list"
          value={typing}
          inputMode="email"
          placeholder={emails.length || chosen ? "" : "Separate with commas"}
          onChange={(event) => {
            const value = event.target.value;
            setOpen(true);
            setActive(0);
            /* A comma, space or semicolon ends an address. */
            if (/[\s,;]$/.test(value)) add(parseEmails(value));
            else setTyping(value);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() =>
            window.setTimeout(() => {
              setOpen(false);
              add(parseEmails(typing));
            }, 120)
          }
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((value) => Math.min(suggestions.length - 1, value + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((value) => Math.max(0, value - 1));
            } else if (event.key === "Enter") {
              event.preventDefault();
              add(open && suggestions[active] ? [suggestions[active].email.toLowerCase()] : parseEmails(typing));
            } else if (event.key === "Backspace" && !typing && emails.length) {
              onChange(emails.slice(0, -1));
            } else if (event.key === "Escape" && open) {
              event.stopPropagation();
              setOpen(false);
            }
          }}
          className="h-7 min-w-[8rem] flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      <AnimatePresence>
        {open && suggestions.length > 0 ? (
          <motion.ul
            id="announcement-emails"
            role="listbox"
            aria-label="People"
            onMouseDown={(event) => event.preventDefault()}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="alva-thin-scrollbar absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-alva-border bg-alva-card py-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.9)]"
          >
            {suggestions.map((person, index) => (
              <li
                key={person.id}
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => add([person.email.toLowerCase()])}
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-3.5 py-2 text-sm",
                  index === active ? "bg-alva-surface text-foreground" : "text-foreground/90"
                )}
              >
                <span className="min-w-0 flex-1 truncate">{person.name}</span>
                <span className="shrink-0 truncate text-xs text-muted-foreground">{person.email}</span>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Drafts (edit, delete) or everything sent (withdraw), newest first. */
function List({
  status,
  version,
  onEdit,
  onChanged,
}: {
  status: "draft" | "sent";
  version: number;
  onEdit: (row: ApiAnnouncement) => void;
  onChanged: () => void;
}) {
  const { rows, reload } = useAnnouncementList(status, version);
  const [acting, setActing] = useState<ApiAnnouncement | null>(null);
  const [pending, setPending] = useState(false);
  const drafts = status === "draft";

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
    return drafts ? (
      <AlvaEmptyState icon={<DocumentText size={20} weight="Outline" />} title="No drafts" />
    ) : (
      <AlvaEmptyState icon={<Bell size={20} weight="Outline" />} title="Nothing sent yet" />
    );
  }

  return (
    <>
      <ul className="divide-y divide-alva-border/70">
        {rows.map((row) => {
          const live = row.status === "sent";
          return (
            <li key={row.id} className="flex items-center">
              <button
                type="button"
                disabled={!drafts && row.status === "withdrawn"}
                onClick={() => (drafts ? onEdit(row) : setActing(row))}
                className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-alva-surface/60 disabled:cursor-default disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-alva-accent"
              >
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    drafts ? "bg-amber-400" : live ? "bg-alva-accent" : "bg-muted-foreground/40"
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground">{row.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {relativeDays(new Date(row.sent_at ?? row.updated_at))}
                    {drafts || live ? "" : row.status === "expired" ? " · Expired" : " · Withdrawn"}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {drafts
                    ? `Reaches ${people(row.recipient_count)}`
                    : `Read by ${row.read_count.toLocaleString()} of ${row.recipient_count.toLocaleString()}`}
                </span>
              </button>
              {drafts ? (
                <button
                  type="button"
                  aria-label={`Delete ${row.title}`}
                  onClick={() => setActing(row)}
                  className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
                >
                  <TrashBinMinimalistic size={16} weight="Outline" />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={acting !== null}
        onOpenChange={(next) => !next && setActing(null)}
        title={drafts ? "Delete this draft?" : "Withdraw this announcement?"}
        description={
          drafts
            ? "This cannot be undone."
            : "It leaves everyone's notifications, read or not. It cannot be sent again."
        }
        confirmLabel={drafts ? "Delete" : "Withdraw"}
        isPending={pending}
        onConfirm={async () => {
          if (!acting) return;
          setPending(true);
          try {
            await (drafts ? deleteAnnouncement(acting.id) : withdrawAnnouncement(acting.id));
            alvaToast.success(drafts ? "Deleted" : "Withdrawn");
          } catch (cause) {
            report(cause, drafts ? "Could not delete that." : "Could not withdraw that.");
          } finally {
            setPending(false);
            setActing(null);
            reload();
            onChanged();
          }
        }}
      />
    </>
  );
}
