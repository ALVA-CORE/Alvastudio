import { useEffect, useMemo, useState } from "react";
import CloseCircle from "@solar-icons/react/ui/CloseCircle";
import KeyMinimalistic from "@solar-icons/react/security/KeyMinimalistic";
import UserBlock from "@solar-icons/react/users/UserBlock";
import Pen from "@solar-icons/react/messages/Pen";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { AlvaSelect } from "@/components/shared/AlvaSelect";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DeleteButton } from "@/components/ui/delete-button";
import { RoleTag } from "@/components/admin/shared/RoleTag";
import { UserActivityHeatmap } from "@/components/admin/users/UserActivityHeatmap";
import { useResizableSize } from "@/hooks/useResizableSize";
import { alvaAccentTextureClass } from "@/lib/alva-texture";
import { alvaFieldClass } from "@/lib/alva-form-styles";
import { diceBearAvatarUrl } from "@/lib/dicebear";
import { alvaToast } from "@/lib/alva-toast";
import {
  ROLE_LABELS,
  activitySummary,
  formatAuditTimestamp,
  userActivity,
  userAuditLog,
  type AdminUser,
  type AdminUserRole,
} from "@/data/admin/users";
import { cn } from "@/lib/utils";

type Tab = "profile" | "activity" | "audit";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "activity", label: "Activity" },
  { id: "audit", label: "Audit log" },
];

const ROLES: AdminUserRole[] = ["contributor", "intern", "annotator", "admin"];

/**
 * Default width.
 *
 * Set by the contribution graph, not by taste: 53 week columns at 9px with a
 * 2px gap is 583px, plus the y-axis gutter and the panel's own padding. Any
 * narrower and a year of activity scrolls sideways, which defeats the point of
 * a calendar you are meant to read at a glance.
 */
const PANEL_WIDTH = 664;
const MIN_WIDTH = 420;

type UserDraft = Pick<AdminUser, "fullName" | "email" | "phone" | "role">;

export function UserDetailPanel({
  open,
  onOpenChange,
  user,
  onToggleActive,
  onDelete,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  onToggleActive: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  onSave: (user: AdminUser, draft: UserDraft) => void;
}) {
  const [tab, setTab] = useState<Tab>("profile");
  const [isEditing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UserDraft | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxWidth = Math.min(
    1100,
    typeof window === "undefined" ? 1100 : window.innerWidth - 120
  );
  const resize = useResizableSize({
    axis: "x",
    // Handle is on the panel's left edge, so dragging left grows it.
    invert: true,
    preferred: PANEL_WIDTH,
    min: MIN_WIDTH,
    max: Math.max(MIN_WIDTH, maxWidth),
  });

  const activity = useMemo(() => (user ? userActivity(user) : []), [user]);
  const summary = useMemo(() => activitySummary(activity), [activity]);
  const audit = useMemo(() => (user ? userAuditLog(user) : []), [user]);

  /* Opening a different user must not carry the previous one's edits. */
  useEffect(() => {
    setEditing(false);
    setDraft(null);
    setError(null);
  }, [user?.id]);

  if (!user) return null;

  const initials = user.fullName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  const value = draft ?? {
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };

  const patch = (next: Partial<UserDraft>) => {
    setDraft({ ...value, ...next });
    setError(null);
  };

  const startEdit = () => {
    setTab("profile");
    setDraft(value);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
    setError(null);
  };

  const commitEdit = () => {
    if (!value.fullName.trim()) return setError("A name is required.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.email)) {
      return setError("That does not look like an email address.");
    }
    onSave(user, {
      ...value,
      fullName: value.fullName.trim(),
      email: value.email.trim(),
    });
    setEditing(false);
    setDraft(null);
    alvaToast.success("Saved");
  };

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setTab("profile");
            cancelEdit();
          }
          onOpenChange(next);
        }}
      >
        <SheetContent
          side="right"
          hideClose
          aria-describedby={undefined}
          style={{ width: resize.size, maxWidth: "100vw" }}
          className="flex max-w-none flex-col gap-0 border-0 bg-alva-bg p-0"
        >
          {/* Drag handle — the panel's own left edge, so there is no rule
              sitting between it and the page when nobody is resizing. */}
          <div
            role="separator"
            aria-label="Resize panel"
            aria-orientation="vertical"
            aria-valuenow={resize.size}
            aria-valuemin={resize.min}
            aria-valuemax={resize.max}
            tabIndex={0}
            {...resize.handleProps}
            className={cn(
              "absolute inset-y-0 left-0 z-30 w-1.5 cursor-col-resize transition-colors",
              "hover:bg-alva-accent/30 focus-visible:bg-alva-accent/40 focus-visible:outline-none",
              resize.isResizing && "bg-alva-accent/40"
            )}
          />

          <div className="relative shrink-0 px-6 pb-0 pt-5">
            <div className="absolute left-5 top-4">
              <DeleteButton
                onConfirm={() => {
                  onDelete(user);
                  onOpenChange(false);
                }}
              />
            </div>

            <button
              type="button"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="absolute right-6 top-6 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
            >
              <CloseCircle size={22} weight="Outline" />
            </button>

            <div className="flex flex-col items-center pt-6 text-center">
              <Avatar
                className={cn(
                  alvaAccentTextureClass,
                  "size-24 border-0 bg-transparent shadow-none ring-0"
                )}
              >
                <AvatarImage src={diceBearAvatarUrl(user.email, "202020")} alt="" />
                <AvatarFallback className="bg-alva-card text-2xl font-semibold text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <SheetTitle className="mt-4 text-xl font-semibold text-foreground">
                {user.fullName}
              </SheetTitle>
              <div className="mt-1 flex items-center gap-2">
                <RoleTag role={user.role} />
                {!user.isActive ? (
                  <span className="text-sm text-muted-foreground">· Deactivated</span>
                ) : null}
              </div>
            </div>

            <nav
              aria-label="User detail sections"
              className="mt-5 flex items-center justify-center gap-7"
            >
              {TABS.map((entry) => {
                const isActive = entry.id === tab;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => setTab(entry.id)}
                    className={cn(
                      "relative pb-2.5 text-sm transition-colors focus-visible:outline-none",
                      isActive
                        ? "font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {entry.label}
                    {isActive ? (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-alva-accent" />
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            {tab === "profile" ? (
              <ProfileTab
                user={user}
                value={value}
                isEditing={isEditing}
                onPatch={patch}
                error={error}
              />
            ) : null}
            {tab === "activity" ? (
              <ActivityTab data={activity} summary={summary} user={user} />
            ) : null}
            {tab === "audit" ? <AuditTab events={audit} /> : null}
          </div>

          <div className="flex shrink-0 items-center gap-2 px-6 pb-5 pt-2">
            {isEditing ? (
              <>
                <PanelAction label="Save changes" tone="accent" onClick={commitEdit} />
                <PanelAction label="Cancel" onClick={cancelEdit} />
              </>
            ) : (
              <>
                <PanelAction
                  icon={<KeyMinimalistic size={16} weight="Outline" />}
                  label="Reset password"
                  onClick={() => alvaToast.success(`Reset link sent to ${user.email}`)}
                />
                <PanelAction
                  icon={<Pen size={16} weight="Outline" />}
                  label="Edit"
                  onClick={startEdit}
                />
                <PanelAction
                  icon={<UserBlock size={16} weight="Outline" />}
                  label={user.isActive ? "Deactivate" : "Reactivate"}
                  tone={user.isActive ? "danger" : "default"}
                  onClick={() => {
                    if (user.isActive) {
                      setConfirmDeactivate(true);
                      return;
                    }
                    onToggleActive(user);
                  }}
                />
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDeactivate}
        onOpenChange={setConfirmDeactivate}
        title={`Deactivate ${user.fullName}?`}
        description={
          <>
            They will not be able to sign in, and anything assigned to them stays
            where it is. Their work is kept. You can reactivate the account at any
            time.
          </>
        }
        confirmLabel="Deactivate"
        onConfirm={() => {
          onToggleActive(user);
          setConfirmDeactivate(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}

function PanelAction({
  icon,
  label,
  onClick,
  tone = "default",
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger" | "accent";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent",
        tone === "danger" && "bg-red-500/10 text-red-400 hover:bg-red-500/15",
        tone === "accent" && "bg-alva-accent text-alva-bg hover:bg-alva-accent/90",
        tone === "default" && "bg-alva-card text-foreground hover:bg-alva-surface"
      )}
    >
      {label}
      {icon}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Tabs
 * ------------------------------------------------------------------ */

/** A group of facts. Separated by a rule rather than titled — with two groups
 *  a heading is a label on the obvious. */
function Group({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-x-5 gap-y-4",
        !first && "mt-6 border-t border-alva-border pt-6"
      )}
    >
      {children}
    </dl>
  );
}

function Field({
  label,
  value,
  span,
}: {
  label: string;
  value: React.ReactNode;
  span?: boolean;
}) {
  return (
    <div className={cn("min-w-0", span && "col-span-2")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className="mt-0.5 truncate text-sm text-foreground"
        title={typeof value === "string" ? value : undefined}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

/** Same slot as `Field`, but editable — so the layout does not shift on Edit. */
function EditField({
  label,
  value,
  onChange,
  span,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  span?: boolean;
  type?: string;
}) {
  return (
    <div className={cn("min-w-0", span && "col-span-2")}>
      <label className="text-xs text-muted-foreground">
        {label}
        <Input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(alvaFieldClass, "mt-1 h-9")}
        />
      </label>
    </div>
  );
}

function ProfileTab({
  user,
  value,
  isEditing,
  onPatch,
  error,
}: {
  user: AdminUser;
  value: UserDraft;
  isEditing: boolean;
  onPatch: (next: Partial<UserDraft>) => void;
  error: string | null;
}) {
  return (
    <>
      <Group first>
        {isEditing ? (
          <>
            <EditField
              label="Full name"
              value={value.fullName}
              onChange={(next) => onPatch({ fullName: next })}
              span
            />
            <EditField
              label="Email"
              type="email"
              value={value.email}
              onChange={(next) => onPatch({ email: next })}
              span
            />
            <EditField
              label="Phone"
              value={value.phone}
              onChange={(next) => onPatch({ phone: next })}
            />
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground">Role</span>
              <AlvaSelect
                aria-label="Role"
                className="mt-1"
                value={value.role}
                onValueChange={(next) => onPatch({ role: next as AdminUserRole })}
                options={ROLES.map((role) => ({
                  value: role,
                  label: ROLE_LABELS[role],
                }))}
              />
            </div>
          </>
        ) : (
          <>
            <Field label="Email" value={user.email} span />
            <Field label="Phone" value={user.phone} />
            <Field label="Role" value={ROLE_LABELS[user.role]} />
            <Field label="Status" value={user.isActive ? "Active" : "Deactivated"} />
            <Field label="Joined" value={user.joinedLabel} />
            <Field
              label="Created"
              value={formatAuditTimestamp(new Date(user.createdAt))}
              span
            />
          </>
        )}
      </Group>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {!isEditing ? (
        <Group>
          <Field
            label={
              user.outputLabel === "—"
                ? "Submissions"
                : user.outputLabel[0].toUpperCase() + user.outputLabel.slice(1)
            }
            value={user.outputLabel === "—" ? "—" : String(user.output)}
          />
          <Field
            label="Can reach"
            value={
              user.role === "admin"
                ? "Every surface"
                : user.role === "contributor"
                  ? "Studio"
                  : user.role === "intern"
                    ? "Record, review"
                    : "Annotation queue"
            }
          />
        </Group>
      ) : null}
    </>
  );
}

function ActivityTab({
  data,
  summary,
  user,
}: {
  data: Parameters<typeof UserActivityHeatmap>[0]["data"];
  summary: ReturnType<typeof activitySummary>;
  user: AdminUser;
}) {
  return (
    <>
      <Group first>
        <Field
          label="Total"
          value={`${summary.total} ${user.outputLabel === "—" ? "actions" : user.outputLabel}`}
        />
        <Field label="Active days" value={String(summary.activeDays)} />
        <Field label="Best streak" value={`${summary.bestStreak} days`} />
        <Field label="Per active day" value={String(summary.perActiveDay)} />
      </Group>

      <div className="mt-6 border-t border-alva-border pt-6">
        <UserActivityHeatmap data={data} />
      </div>
    </>
  );
}

function AuditTab({ events }: { events: ReturnType<typeof userAuditLog> }) {
  if (events.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nothing has happened to this account yet.
      </p>
    );
  }

  return (
    <ol className="relative">
      {events.map((event, index) => (
        <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
          {index < events.length - 1 ? (
            <span
              aria-hidden
              className="absolute left-[3.5px] top-3 h-full w-px bg-alva-border"
            />
          ) : null}
          <span
            aria-hidden
            className={cn(
              "relative mt-1.5 size-2 shrink-0 rounded-full",
              event.byAdmin ? "bg-amber-300" : "bg-alva-accent"
            )}
          />
          <div className="min-w-0">
            <p className="text-sm text-foreground">{event.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatAuditTimestamp(event.at)}
              {event.byAdmin ? " · by an admin" : null}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
