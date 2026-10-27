import { useEffect, useMemo, useState } from "react";
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
import { useUserProfiles } from "@/hooks/useUserProfiles";
import { useUserActivity } from "@/hooks/useUserActivity";
import { useUserEmailEntries } from "@/hooks/useUserEmailEntries";
import { useAuditLog } from "@/hooks/useAuditLog";
import { UserActivitySection } from "@/components/admin/users/UserActivitySection";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DeleteButton } from "@/components/ui/delete-button";
import { TextureButton } from "@/components/ui/texture-button";
import { RoleTag } from "@/components/admin/shared/RoleTag";
import { PasswordResetDialog } from "@/components/admin/users/PasswordResetDialog";
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
  const [resetOpen, setResetOpen] = useState(false);

  /* Above the `!user` guard below: hooks cannot be conditional, and this
   * panel returns null before it renders anything. */
  const profiles = useUserProfiles(user?.id);

  /* Only once the tab is opened: a year of daily counts for somebody whose
   * profile is all an admin wanted is a request nobody asked for. */
  const activity = useUserActivity(user?.id, open && tab === "activity");

  /* One list, sign-ins included. The API leaves them out by default and we
   * ask for them back: "signed in on a new device" followed by "password
   * changed" is a story only one timeline can tell, and splitting it across a
   * filter makes an admin join two lists by timestamp in their head.
   *
   * It pages, which is what makes that safe. Several hundred sign-ins a year
   * against a few dozen real events would otherwise push a password change
   * off the end of a fixed fetch, with nothing on screen saying so. */
  const {
    entries: audit,
    total: auditTotal,
    isLoading: auditLoading,
    isLoadingMore: loadingMoreAudit,
    hasMore: hasMoreAudit,
    loadMore: loadMoreAudit,
  } = useAuditLog("user", user?.id, open && tab === "audit", "include");

  /* Interleaved with the rest. "A reset was issued, did anything reach
     them" is two rows next to each other, not two screens — and a reset
     with no email row beneath it says the API never tried, which is a
     different fault from one that was refused. */
  const emailEntries = useUserEmailEntries(user?.id, open && tab === "audit");

  const history = useMemo(
    () =>
      [...audit, ...emailEntries].sort((a, b) => b.at.getTime() - a.at.getTime()),
    [audit, emailEntries]
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
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
  };

  /* Toasts, not a line under the fields. The panel scrolls, and the Save
     button lives in a footer pinned below the scroll area: an error rendered
     beside the inputs can be off screen at the moment somebody presses the
     thing that caused it. */
  const commitEdit = () => {
    if (!value.fullName.trim()) {
      return alvaToast.error("A name is required.");
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.email)) {
      return alvaToast.error("That does not look like an email address.");
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
                    /* The dialog asks first and sends the email itself. It
                     * used to issue a token here and print it for the admin
                     * to pass on by hand, which meant finding a private
                     * channel to every locked-out person. */
                    setResetOpen(true);
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
            <AuditTimeline
              entries={history}
              emptyMessage={
                auditLoading ? "Loading." : "Nothing has happened to this account yet."
              }
            />

            {/* How much is left, and a way to get it. The count matters as
                much as the button: an admin who reads to the bottom of a
                list that simply stops has no way to tell a quiet account
                from a truncated one. */}
            {hasMoreAudit ? (
              <div className="mt-5 flex flex-col items-center gap-2">
                <TextureButton
                  variant="minimal"
                  size="sm"
                  className="w-auto"
                  loading={loadingMoreAudit}
                  onClick={() => void loadMoreAudit()}
                >
                  Load more
                </TextureButton>
                <p className="text-xs text-muted-foreground">
                  Showing {audit.length} of {auditTotal} account events
                </p>
              </div>
            ) : null}

            {/* Said once, at the bottom. A gap in this list means "nobody
                signed in" inside a year and "we no longer know" before it,
                and nothing else in the log expires. */}
            <p className="mt-6 border-t border-alva-border pt-4 text-xs leading-relaxed text-muted-foreground">
              Sign-ins, sign-outs and refused attempts are kept for a year.
              The device is read from the browser; no IP address is recorded.
              An email row says the mail service accepted it, which is not the
              same as an inbox receiving it.
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
        userId={user.id}
        fullName={user.fullName}
        email={user.email}
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
