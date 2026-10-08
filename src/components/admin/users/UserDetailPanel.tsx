import { useEffect, useMemo, useState } from "react";
import KeyMinimalistic from "@solar-icons/react/security/KeyMinimalistic";
import UserBlock from "@solar-icons/react/users/UserBlock";
import UserCheckRounded from "@solar-icons/react/users/UserCheckRounded";
import Pen from "@solar-icons/react/messages/Pen";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlvaSelect } from "@/components/shared/AlvaSelect";
import { AlvaMultiSelect } from "@/components/shared/AlvaMultiSelect";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DeleteButton } from "@/components/ui/delete-button";
import { RoleTag } from "@/components/admin/shared/RoleTag";
import { UserActivityHeatmap } from "@/components/admin/users/UserActivityHeatmap";
import { SharePie } from "@/components/admin/shared/SharePie";
import { ApprovalGauge } from "@/components/admin/shared/ApprovalGauge";
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
  canResetPassword,
  activityNoun,
  activitySummary,
  roleStats,
  userActivity,
  userAuditLog,
  type AdminPermission,
  type AdminUser,
  type AdminUserRole,
  type RoleStat,
} from "@/data/admin/users";
import { cn } from "@/lib/utils";

/** Names the work, not the person — "Output" told an admin nothing. */
const ROLE_WORK_TITLE: Record<AdminUserRole, string> = {
  contributor: "Recording",
  intern: "Field work",
  annotator: "Annotation",
  admin: "Admin activity",
};

/** Kept, in flight, lost — the accent only for the part that counted. */
const OUTCOME_PALETTE = [
  "hsl(146 87% 54%)",
  "hsl(38 92% 50%)",
  "hsl(0 72% 55%)",
];

/**
 * Splits a person's work into kept / pending / lost.
 *
 * Read off the role stats rather than recomputed, so the pie and the figures
 * above it can never disagree — two views of the same numbers that drift apart
 * is worse than one view.
 */
function outcomeSplit(user: AdminUser, stats: RoleStat[]) {
  const find = (label: string) =>
    Number(stats.find((stat) => stat.label === label)?.value.replace(/[^\d]/g, "") ?? 0);

  if (user.role === "contributor") {
    const kept = find("Approved");
    const lost = find("Rejected");
    const waiting = find("Awaiting review");
    if (kept + lost + waiting === 0) return null;
    return {
      title: "How their recordings landed",
      centerLabel: "clips",
      rateLabel: "approved",
      rate: kept + lost > 0 ? Math.round((kept / (kept + lost)) * 100) : 0,
      slices: [
        { label: "Approved", hours: kept },
        { label: "Awaiting", hours: waiting },
        { label: "Rejected", hours: lost },
      ].filter((slice) => slice.hours > 0),
    };
  }

  if (user.role === "annotator") {
    const kept = find("Approved");
    const lost = find("Needs rework");
    const open = find("Currently claimed");
    if (kept + lost + open === 0) return null;
    return {
      title: "How their annotations landed",
      centerLabel: "sessions",
      rateLabel: "approved",
      rate: kept + lost > 0 ? Math.round((kept / (kept + lost)) * 100) : 0,
      slices: [
        { label: "Approved", hours: kept },
        { label: "In progress", hours: open },
        { label: "Needs rework", hours: lost },
      ].filter((slice) => slice.hours > 0),
    };
  }

  if (user.role === "intern") {
    const uploaded = find("Audio uploaded");
    const missing = find("Missing audio");
    if (uploaded + missing === 0) return null;
    return {
      title: "Sessions that reached an annotator",
      centerLabel: "sessions",
      rateLabel: "uploaded",
      rate:
        uploaded + missing > 0
          ? Math.round((uploaded / (uploaded + missing)) * 100)
          : 0,
      slices: [
        { label: "Audio uploaded", hours: uploaded },
        { label: "Missing audio", hours: missing },
      ].filter((slice) => slice.hours > 0),
    };
  }

  return null;
}

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
  const [error, setError] = useState<string | null>(null);

  const activity = useMemo(() => (user ? userActivity(user) : []), [user]);
  const summary = useMemo(() => activitySummary(activity), [activity]);
  const audit = useMemo(() => (user ? userAuditLog(user) : []), [user]);
  /* The figures this person sees on their own dashboard. An admin reading a
   * contributor should be looking at the same numbers the contributor is. */
  const stats = useMemo(() => (user ? roleStats(user) : []), [user]);

  /* Two charts rather than a third tab. The activity tab already answers
   * "how much and how often"; this answers "how much of it was any good",
   * which is the next question in every case and belongs beside the first. */
  const outcome = useMemo(() => (user ? outcomeSplit(user, stats) : null), [user, stats]);

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
                  onClick={() => alvaToast.success(`Reset link sent to ${user.email}`)}
                />
              ) : null}
              <PanelAction
                icon={<Pen size={15} weight="Outline" />}
                label="Edit"
                onClick={() => {
                  setTab("profile");
                  setDraft(value);
                  setEditing(true);
                }}
              />
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
              <DetailGroup title={ROLE_WORK_TITLE[user.role]}>
                {stats.map((stat) => (
                  <DetailField
                    key={stat.label}
                    label={stat.label}
                    value={stat.value}
                    tone={stat.tone}
                  />
                ))}
              </DetailGroup>
            ) : null}
          </>
        ) : null}

        {tab === "activity" ? (
          <>
            <DetailGroup title="Last 12 months" first>
              <DetailField
                label="Total"
                value={`${summary.total} ${activityNoun(user)}`}
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

            {outcome ? (
              <section className="mt-6 border-t border-alva-border pt-6">
                <h3 className="text-sm font-medium text-foreground">
                  {outcome.title}
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="h-40 rounded-xl bg-alva-surface p-2">
                    <SharePie
                      slices={outcome.slices}
                      centerLabel={outcome.centerLabel}
                      valueSuffix=""
                      palette={OUTCOME_PALETTE}
                    />
                  </div>
                  <div className="h-40 rounded-xl bg-alva-surface p-2">
                    <ApprovalGauge value={outcome.rate} label={outcome.rateLabel} />
                  </div>
                </div>
              </section>
            ) : null}
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
