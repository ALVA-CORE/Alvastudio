import { useEffect, useState } from "react";
import KeyMinimalistic from "@solar-icons/react/security/KeyMinimalistic";
import UserBlock from "@solar-icons/react/users/UserBlock";
import UserCheckRounded from "@solar-icons/react/users/UserCheckRounded";
import Pen from "@solar-icons/react/messages/Pen";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlvaSelect } from "@/components/shared/AlvaSelect";
import { AlvaMultiSelect } from "@/components/shared/AlvaMultiSelect";
import { ApplicationSection } from "@/components/admin/users/ApplicationSection";
import {
  ContributorProfileSection,
  IdentitySection,
} from "@/components/admin/users/ContributorProfileSection";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuditSignIns } from "@/lib/api/audit";
import { useUserProfiles } from "@/hooks/useUserProfiles";
import { useUserActivity } from "@/hooks/useUserActivity";
import { useAuditLog } from "@/hooks/useAuditLog";
import { UserActivitySection } from "@/components/admin/users/UserActivitySection";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DeleteButton } from "@/components/ui/delete-button";
import { RoleTag } from "@/components/admin/shared/RoleTag";
import { PasswordResetDialog } from "@/components/admin/users/PasswordResetDialog";
import { issuePasswordReset } from "@/lib/api/users";
import { reportApiError } from "@/lib/api/reportApiError";
import { DeleteUserDialog } from "@/components/admin/users/DeleteUserDialog";
import {
  AuditTimeline,
  DetailEditField,
  DetailField,
  DetailGroup,
  DetailPanel,
  PanelAction,
  formatAuditTimestamp,
} from "@/components/admin/shared/detail";
import { alvaAccentTextureClass } from "@/lib/alva-texture";
import { diceBearAvatarUrl } from "@/lib/dicebear";
import { alvaToast } from "@/lib/alva-toast";
import {
  ADMIN_PERMISSIONS,
  CREATABLE_ROLES,
  ROLE_LABELS,
  STATUS_LABEL,
  accountStatus,
  canEditProfile,
  canResetPassword,
  type AdminPermission,
  type AdminUser,
  type AdminUserRole,
} from "@/data/admin/users";
import { cn } from "@/lib/utils";

/** Names the work, not the person — "Output" told an admin nothing. */

/** Kept, in flight, lost — the accent only for the part that counted. */

/**
 * Splits a person's work into kept / pending / lost.
 *
 * Read off the role stats rather than recomputed, so the pie and the figures
 * above it can never disagree — two views of the same numbers that drift apart
 * is worse than one view.
 */

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "activity", label: "Activity" },
  { id: "audit", label: "Audit log" },
];

/**
 * Wide enough for a year of the contribution graph — 53 columns at 7px with a
 * 2px gap is 477px, plus the panel's 48px of padding.
 */
const PANEL_WIDTH = 500;

type UserDraft = Pick<AdminUser, "fullName" | "email" | "phone" | "role"> & {
  permissions: AdminPermission[];
};

export function UserDetailPanel({
  open,
  onOpenChange,
  user,
  onToggleActive,
  onApprove,
  onDelete,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  onToggleActive: (user: AdminUser) => void;
  onApprove: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  onSave: (user: AdminUser, draft: UserDraft) => void;
}) {
  const [tab, setTab] = useState("profile");
  const [isEditing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UserDraft | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /* Null while the token is being generated, so the dialog can open at once
   * rather than after a round trip. */
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Above the `!user` guard below: hooks cannot be conditional, and this
   * panel returns null before it renders anything. */
  const profiles = useUserProfiles(user?.id);

  /* Only once the tab is opened: a year of daily counts for somebody whose
   * profile is all an admin wanted is a request nobody asked for. */
  const activity = useUserActivity(user?.id, open && tab === "activity");

  /* Sign-ins live in the audit log, behind a filter rather than a tab of
   * their own. They are high volume — somebody signing in every morning is
   * 250 rows a year against a handful of verdicts — so "Everything" asks for
   * `include` and the API's own default would have left them out. */
  const [auditView, setAuditView] = useState<AuditSignIns>("include");
  const { entries: audit, isLoading: auditLoading } = useAuditLog(
    "user",
    user?.id,
    open && tab === "audit",
    auditView
  );
  /* The figures this person sees on their own dashboard. An admin reading a
   * contributor should be looking at the same numbers the contributor is. */

  /* Two charts rather than a third tab. The activity tab already answers
   * "how much and how often"; this answers "how much of it was any good",
   * which is the next question in every case and belongs beside the first. */

  /* Opening a different user must not carry the previous one's edits. */
  useEffect(() => {
    setEditing(false);
    setDraft(null);
    setError(null);
  }, [user?.id]);

  if (!user) return null;

  const value: UserDraft = draft ?? {
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    permissions: user.permissions ?? [],
  };

  const patch = (next: Partial<UserDraft>) => {
    setDraft({ ...value, ...next });
    setError(null);
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
      permissions: value.role === "admin" ? value.permissions : [],
    });
    setEditing(false);
    setDraft(null);
    alvaToast.success("Saved");
  };

  const status = accountStatus(user);

  const initials = user.fullName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <>
      <DetailPanel
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setTab("profile");
            cancelEdit();
          }
          onOpenChange(next);
        }}
        title={user.fullName}
        preferredWidth={PANEL_WIDTH}
        tabs={TABS}
        activeTab={tab}
        onTabChange={setTab}
        leading={
          /* The bin opens the dialog rather than doing it: its own confirm
             pair carries no words, and this is a hard delete. */
          <DeleteButton onConfirm={() => setConfirmDelete(true)} />
        }
        header={
          <div className="flex flex-col items-center text-center">
            <Avatar
              className={cn(
                alvaAccentTextureClass,
                "size-24 border-0 bg-transparent shadow-none ring-0"
              )}
            >
              <AvatarImage src={diceBearAvatarUrl(user.email, "202020")} alt="" />
              <AvatarFallback className="bg-alva-surface text-2xl font-semibold text-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>

            <p className="mt-4 text-xl font-semibold text-foreground">
              {user.fullName}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <RoleTag role={user.role} />
              {status !== "active" ? (
                <span
                  className={cn(
                    "text-sm",
                    status === "pending" ? "text-amber-300" : "text-muted-foreground"
                  )}
                >
                  · {STATUS_LABEL[status]}
                </span>
              ) : null}
            </div>
          </div>
        }
        footer={
          isEditing ? (
            <>
              <PanelAction label="Save changes" tone="primary" onClick={commitEdit} />
              <PanelAction label="Cancel" onClick={cancelEdit} />
            </>
          ) : (
            <>
              {canResetPassword(user) ? (
                <PanelAction
                  icon={<KeyMinimalistic size={15} weight="Outline" />}
                  label="Reset password"
                  onClick={() => {
                    setResetToken(null);
                    setResetError(null);
                    setResetOpen(true);
                    /* The real token. This dialog used to show a made-up
                     * string shaped like one, which an admin would hand over
                     * in good faith and which could never redeem.
                     *
                     * It matters more than it did: with the mail provider
                     * refusing every reset email, this is the only way back
                     * into an account. */
                    issuePasswordReset(user.id)
                      .then((issued) => setResetToken(issued.token))
                      .catch((cause: unknown) =>
                        setResetError(
                          reportApiError(cause, "Could not issue a reset token.")
                        )
                      );
                  }}
                />
              ) : null}
              {/* A contributor's and an intern's profile is theirs: they
                  filled it in at signup and it carries their consent record.
                  Deactivating and deleting stay available for every role. */}
              {canEditProfile(user) ? (
                <PanelAction
                  icon={<Pen size={15} weight="Outline" />}
                  label="Edit"
                  onClick={() => {
                    setTab("profile");
                    setDraft(value);
                    setEditing(true);
                  }}
                />
              ) : null}
              {/* An application is approved or it is deleted. Deactivating one
                  would park it in a third state nobody is waiting on. */}
              {status === "pending" ? (
                <PanelAction
                  icon={<UserCheckRounded size={15} weight="Outline" />}
                  label="Approve"
                  tone="primary"
                  onClick={() => onApprove(user)}
                />
              ) : (
                <PanelAction
                  icon={<UserBlock size={15} weight="Outline" />}
                  label={user.isActive ? "Deactivate" : "Reactivate"}
                  tone={user.isActive ? "danger" : "primary"}
                  onClick={() => {
                    if (user.isActive) return setConfirmDeactivate(true);
                    onToggleActive(user);
                  }}
                />
              )}
            </>
          )
        }
      >
        {tab === "profile" ? (
          <>
            <DetailGroup title="Account" first>
              {isEditing ? (
                <>
                  <DetailEditField
                    label="Full name"
                    value={value.fullName}
                    onChange={(next) => patch({ fullName: next })}
                    span
                  />
                  <DetailEditField
                    label="Email"
                    type="email"
                    value={value.email}
                    onChange={(next) => patch({ email: next })}
                    span
                  />
                  <DetailEditField
                    label="Phone"
                    value={value.phone}
                    onChange={(next) => patch({ phone: next })}
                  />
                  <div className="min-w-0">
                    <span className="text-xs text-muted-foreground">Role</span>
                    <AlvaSelect
                      aria-label="Role"
                      className="mt-1"
                      value={value.role}
                      onValueChange={(next) => patch({ role: next as AdminUserRole })}
                      options={CREATABLE_ROLES.map((role) => ({
                        value: role,
                        label: ROLE_LABELS[role],
                      }))}
                    />
                  </div>
                </>
              ) : (
                <>
                  <DetailField label="Email" value={user.email} span />
                  <DetailField label="Phone" value={user.phone} />
                  <DetailField label="Role" value={ROLE_LABELS[user.role]} />
                  <DetailField
                    label="Status"
                    value={user.isActive ? "Active" : "Deactivated"}
                    tone={user.isActive ? "accent" : "muted"}
                  />
                  <DetailField label="Joined" value={user.joinedLabel} />
                  <DetailField
                    label="Created"
                    value={formatAuditTimestamp(new Date(user.createdAt))}
                    span
                  />
                </>
              )}
            </DetailGroup>

            {/* Only while the decision is open. Once approved this is their
                profile, and repeating it here would imply otherwise. */}
            {status === "pending" ? (
              <ApplicationSection user={user} profiles={profiles} />
            ) : null}

            {/* Everything a contributor answered at sign-up. The corpus is
                sorted by these, so an admin looking at a person should be
                able to see them without leaving the panel. */}
            {user.role === "contributor" ? (
              <>
                <ContributorProfileSection profiles={profiles} />
                {/* Whether their money can move, which is the other reason an
                    admin opens a contributor. */}
                <IdentitySection profiles={profiles} />
              </>
            ) : null}

            {error ? (
              <p role="alert" className="mt-3 text-xs text-destructive">
                {error}
              </p>
            ) : null}

            {value.role === "admin" ? (
              <DetailGroup title="Page access">
                <div className="col-span-2 min-w-0">
                  <p className="mb-1.5 text-[11px] text-amber-300">
                    Not enforced yet, role decides what an admin can open.
                  </p>
                  {/* Disabled, not removed.
                      Backend confirmed role is the whole authority model: a
                      permission list enforced on some routes and not others
                      would imply a boundary the API does not hold. Kept on
                      screen because the concept may come back, and labelled
                      so nobody believes it is doing anything. */}
                  {isEditing ? (
                    <AlvaMultiSelect
                      disabled
                      aria-label="Page access"
                      value={value.permissions}
                      onChange={(next) =>
                        patch({ permissions: next as AdminPermission[] })
                      }
                      options={ADMIN_PERMISSIONS.map((permission) => ({
                        value: permission.id,
                        label: permission.label,
                        detail: permission.detail,
                      }))}
                      placeholder="No areas"
                    />
                  ) : (
                    <p className="text-sm leading-relaxed text-foreground">
                      {value.permissions.length === 0
                        ? "No areas"
                        : value.permissions.length === ADMIN_PERMISSIONS.length
                          ? "Every area"
                          : ADMIN_PERMISSIONS.filter((permission) =>
                              value.permissions.includes(permission.id)
                            )
                              .map((permission) => permission.label)
                              .join(", ")}
                    </p>
                  )}
                </div>
              </DetailGroup>
            ) : null}

          </>
        ) : null}

        {tab === "activity" ? <UserActivitySection activity={activity} /> : null}

        {tab === "audit" ? (
          <>
            <Tabs
              value={auditView}
              onValueChange={(value) => setAuditView(value as AuditSignIns)}
            >
              <TabsList className="h-9 rounded-full bg-alva-surface p-1">
                <TabsTrigger
                  value="include"
                  className="rounded-full px-4 text-sm data-[state=active]:bg-alva-card data-[state=active]:text-foreground"
                >
                  Everything
                </TabsTrigger>
                <TabsTrigger
                  value="only"
                  className="rounded-full px-4 text-sm data-[state=active]:bg-alva-card data-[state=active]:text-foreground"
                >
                  Sign-ins
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-5">
              <AuditTimeline
                entries={audit}
                emptyMessage={
                  auditLoading
                    ? "Loading."
                    : auditView === "only"
                      ? "No sign-ins on record."
                      : "Nothing has happened to this account yet."
                }
              />
            </div>

            {/* Said once, at the bottom. A gap in this list means "nobody
                signed in" inside 90 days and "we no longer know" before it,
                and nothing else in the log expires. */}
            <p className="mt-6 border-t border-alva-border pt-4 text-xs leading-relaxed text-muted-foreground">
              Sign-ins, sign-outs and refused attempts are kept for 90 days.
              The device is read from the browser; no IP address is recorded.
            </p>
          </>
        ) : null}

      </DetailPanel>

      <DeleteUserDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        user={user}
        onConfirm={() => {
          onDelete(user);
          onOpenChange(false);
        }}
        onDeactivate={() => onToggleActive(user)}
      />

      <PasswordResetDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        fullName={user.fullName}
        token={resetToken}
        error={resetError}
      />

      <ConfirmDialog
        open={confirmDeactivate}
        onOpenChange={setConfirmDeactivate}
        title={`Deactivate ${user.fullName}?`}
        description="They will not be able to sign in, and anything assigned to them stays where it is. Their work is kept. You can reactivate the account at any time."
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
