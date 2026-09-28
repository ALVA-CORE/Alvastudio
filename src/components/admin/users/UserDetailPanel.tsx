import { useEffect, useMemo, useState } from "react";
import KeyMinimalistic from "@solar-icons/react/security/KeyMinimalistic";
import UserBlock from "@solar-icons/react/users/UserBlock";
import Pen from "@solar-icons/react/messages/Pen";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlvaSelect } from "@/components/shared/AlvaSelect";
import { AlvaMultiSelect } from "@/components/shared/AlvaMultiSelect";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DeleteButton } from "@/components/ui/delete-button";
import { RoleTag } from "@/components/admin/shared/RoleTag";
import { UserActivityHeatmap } from "@/components/admin/users/UserActivityHeatmap";
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
  activitySummary,
  userActivity,
  userAuditLog,
  type AdminPermission,
  type AdminUser,
  type AdminUserRole,
} from "@/data/admin/users";
import { cn } from "@/lib/utils";

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
  const [tab, setTab] = useState("profile");
  const [isEditing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UserDraft | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <DeleteButton
            onConfirm={() => {
              onDelete(user);
              onOpenChange(false);
            }}
          />
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
              {!user.isActive ? (
                <span className="text-sm text-muted-foreground">· Deactivated</span>
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
              <PanelAction
                icon={<KeyMinimalistic size={15} weight="Outline" />}
                label="Reset password"
                onClick={() => alvaToast.success(`Reset link sent to ${user.email}`)}
              />
              <PanelAction
                icon={<Pen size={15} weight="Outline" />}
                label="Edit"
                onClick={() => {
                  setTab("profile");
                  setDraft(value);
                  setEditing(true);
                }}
              />
              <PanelAction
                icon={<UserBlock size={15} weight="Outline" />}
                label={user.isActive ? "Deactivate" : "Reactivate"}
                tone={user.isActive ? "danger" : "primary"}
                onClick={() => {
                  if (user.isActive) return setConfirmDeactivate(true);
                  onToggleActive(user);
                }}
              />
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

            {error ? (
              <p role="alert" className="mt-3 text-xs text-destructive">
                {error}
              </p>
            ) : null}

            {value.role === "admin" ? (
              <DetailGroup title="Page access">
                <div className="col-span-2 min-w-0">
                  {isEditing ? (
                    <AlvaMultiSelect
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

            {!isEditing ? (
              <DetailGroup title="Output">
                <DetailField
                  label={
                    user.outputLabel === "—"
                      ? "Submissions"
                      : user.outputLabel[0].toUpperCase() + user.outputLabel.slice(1)
                  }
                  value={user.outputLabel === "—" ? "—" : String(user.output)}
                />
                <DetailField
                  label="Can reach"
                  value={
                    user.role === "admin"
                      ? "Admin areas"
                      : user.role === "contributor"
                        ? "Studio"
                        : user.role === "intern"
                          ? "Record, review"
                          : "Annotation queue"
                  }
                />
              </DetailGroup>
            ) : null}
          </>
        ) : null}

        {tab === "activity" ? (
          <>
            <DetailGroup title="Last 12 months" first>
              <DetailField
                label="Total"
                value={`${summary.total} ${
                  user.outputLabel === "—" ? "actions" : user.outputLabel
                }`}
              />
              <DetailField label="Active days" value={String(summary.activeDays)} />
              <DetailField label="Best streak" value={`${summary.bestStreak} days`} />
              <DetailField label="Per active day" value={String(summary.perActiveDay)} />
            </DetailGroup>

            <section className="mt-6 border-t border-alva-border pt-6">
              <h3 className="text-sm font-medium text-foreground">Contribution graph</h3>
              <div className="mt-3">
                <UserActivityHeatmap data={activity} />
              </div>
            </section>
          </>
        ) : null}

        {tab === "audit" ? (
          <AuditTimeline
            entries={audit}
            emptyMessage="Nothing has happened to this account yet."
          />
        ) : null}
      </DetailPanel>

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
