import { useMemo, useState } from "react";
import UsersGroupRounded from "@solar-icons/react/users/UsersGroupRounded";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import ShieldUser from "@solar-icons/react/security/ShieldUser";
import AddCircle from "@solar-icons/react/ui/AddCircle";
import { DesktopPageShell } from "@/components/layout/DesktopPageShell";
import { MetricCard } from "@/components/shared/MetricCard";
import { AlvaDataTable } from "@/components/shared/AlvaDataTable";
import { TextureButton } from "@/components/ui/texture-button";
import { DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminPageSkeleton } from "@/components/admin/shared/AdminPageSkeleton";
import { AdminStatusPill } from "@/components/admin/shared/AdminStatusPill";
import { RoleTag } from "@/components/admin/shared/RoleTag";
import { UserSheet, type UserDraft } from "@/components/admin/users/UserSheet";
import { UserDetailPanel } from "@/components/admin/users/UserDetailPanel";
import {
  ADMIN_USERS,
  EMPTY_USER_METRICS,
  ROLE_LABELS,
  userMetrics,
  type AdminUser,
  type AdminUserRole,
} from "@/data/admin/users";
import { alvaToast } from "@/lib/alva-toast";
import { useDevRows, useSimulatedLoading } from "@/hooks/use-dev-ui-state";

type RoleFilter = AdminUserRole | "all";
type StatusFilter = "all" | "active" | "inactive";

export default function AdminUsersPage() {
  const isLoading = useSimulatedLoading();
  const [users, setUsers] = useState<AdminUser[]>(ADMIN_USERS);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  /* Two panels, deliberately. Clicking a row opens the record — the thing an
   * admin wants nine times out of ten — and editing is a second step from
   * inside it. A row click that drops you straight into a form makes reading
   * an account feel like you are about to change it. */
  const [detail, setDetail] = useState<AdminUser | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const rows = useDevRows(users);
  const isEmpty = rows.length === 0;
  const metrics = isEmpty ? EMPTY_USER_METRICS : userMetrics(rows);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (roleFilter !== "all" && row.role !== roleFilter) return false;
        if (statusFilter === "active" && !row.isActive) return false;
        if (statusFilter === "inactive" && row.isActive) return false;
        return true;
      }),
    [rows, roleFilter, statusFilter]
  );

  const handleSave = (draft: UserDraft) => {
    setUsers((prev) => [
      {
        id: `u-${crypto.randomUUID().slice(0, 6)}`,
        ...draft,
        isActive: true,
        createdAt: Date.now(),
        joinedLabel: "Just now",
        output: 0,
        outputLabel:
          draft.role === "contributor"
            ? "recordings"
            : draft.role === "intern"
              ? "sessions"
              : draft.role === "annotator"
                ? "annotations"
                : "—",
      },
      ...prev,
    ]);
    alvaToast.success(`${ROLE_LABELS[draft.role]} account created`);
  };

  const handleDelete = (user: AdminUser) => {
    setUsers((prev) => prev.filter((row) => row.id !== user.id));
    alvaToast.show(`${user.fullName} removed`, { variant: "default" });
  };

  const handleToggleActive = (user: AdminUser) => {
    setUsers((prev) =>
      prev.map((row) =>
        row.id === user.id ? { ...row, isActive: !row.isActive } : row
      )
    );
    alvaToast.show(user.isActive ? "Account deactivated" : "Account reactivated", {
      variant: "default",
    });
  };

  const columns = [
    {
      key: "fullName",
      header: "Name",
      sortValue: (row: AdminUser) => row.fullName,
      render: (row: AdminUser) => (
        <span className="font-medium text-foreground">{row.fullName}</span>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortValue: (row: AdminUser) => row.email,
      render: (row: AdminUser) => (
        <span className="text-muted-foreground">{row.email}</span>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortValue: (row: AdminUser) => row.role,
      render: (row: AdminUser) => <RoleTag role={row.role} />,
    },
    {
      key: "output",
      header: "Output",
      sortValue: (row: AdminUser) => row.output,
      render: (row: AdminUser) =>
        row.outputLabel === "—" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="whitespace-nowrap tabular-nums text-muted-foreground">
            {row.output} {row.outputLabel}
          </span>
        ),
    },
    {
      key: "isActive",
      header: "Status",
      sortValue: (row: AdminUser) => String(row.isActive),
      render: (row: AdminUser) => (
        <AdminStatusPill tone={row.isActive ? "good" : "neutral"}>
          {row.isActive ? "Active" : "Deactivated"}
        </AdminStatusPill>
      ),
    },
    {
      key: "joinedLabel",
      header: "Joined",
      sortValue: (row: AdminUser) => row.createdAt,
      render: (row: AdminUser) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.joinedLabel}</span>
      ),
    },
  ];

  const activeFilterCount =
    (roleFilter === "all" ? 0 : 1) + (statusFilter === "active" ? 0 : 1);

  return (
    <DesktopPageShell className="py-4">
      <AdminPageHeader
        id="users"
        actions={
          <TextureButton
            variant="alva"
            size="sm"
            className="w-auto"
            onClick={() => setSheetOpen(true)}
          >
            <AddCircle size={15} weight="Outline" />
            New user
          </TextureButton>
        }
      />

      {isLoading ? (
        <AdminPageSkeleton charts={0} chartColumns={3} table={true} />
      ) : (
        <>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          variant="accent"
          title="Total accounts"
          value={metrics.total}
          trend={{ label: "", positive: false, neutral: true }}
          period=""
          icon={UsersGroupRounded}
        />
        <MetricCard
          title="Active"
          value={metrics.active}
          trend={{ label: "", positive: false, neutral: true }}
          period=""
          icon={CheckCircle}
        />
        <MetricCard
          title="Staff"
          value={metrics.staff}
          trend={{ label: "interns, annotators, admins", positive: false, neutral: true }}
          period=""
          icon={ShieldUser}
        />
        <MetricCard
          title="Joined this week"
          value={metrics.joinedThisWeek}
          trend={{ label: "", positive: false, neutral: true }}
          period=""
          icon={AddCircle}
        />
      </div>

      <div className="mt-3">
        <AlvaDataTable
          title="Accounts"
          rows={filtered}
          columns={columns}
          pageSize={10}
          searchPlaceholder="Search name or email"
          searchKeys={["fullName", "email"]}
          activeFilterCount={activeFilterCount}
          onRowClick={(row) => {
            setDetail(row);
            setDetailOpen(true);
          }}
          mobilePrimary={(row) => ({
            title: row.fullName,
            subtitle: `${ROLE_LABELS[row.role]} · ${row.joinedLabel}`,
          })}
          filterMenuContent={
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Role
              </DropdownMenuLabel>
              {(["all", "contributor", "intern", "annotator", "admin"] as RoleFilter[]).map(
                (value) => (
                  <DropdownMenuCheckboxItem
                    key={value}
                    checked={roleFilter === value}
                    onCheckedChange={() => setRoleFilter(value)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {value === "all" ? "All roles" : ROLE_LABELS[value]}
                  </DropdownMenuCheckboxItem>
                )
              )}
              <DropdownMenuLabel className="mt-1 text-xs text-muted-foreground">
                Status
              </DropdownMenuLabel>
              {(["active", "inactive", "all"] as StatusFilter[]).map((value) => (
                <DropdownMenuCheckboxItem
                  key={value}
                  checked={statusFilter === value}
                  onCheckedChange={() => setStatusFilter(value)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {value === "all"
                    ? "All"
                    : value === "active"
                      ? "Active only"
                      : "Deactivated only"}
                </DropdownMenuCheckboxItem>
              ))}
            </>
          }
          emptyState={{
            icon: <UsersGroupRounded size={20} weight="Outline" />,
            title: "No accounts match",
            description: "Clear the filters, or create the first one.",
          }}
        />
      </div>

      <UserDetailPanel
        open={detailOpen}
        onOpenChange={setDetailOpen}
        user={detail}
        onToggleActive={handleToggleActive}
        onDelete={handleDelete}
        onSave={(target, draft) => {
          setUsers((prev) =>
            prev.map((row) => (row.id === target.id ? { ...row, ...draft } : row))
          );
          setDetail((current) =>
            current && current.id === target.id ? { ...current, ...draft } : current
          );
        }}
      />

      {/* Creating only — an existing user is edited inside the detail panel. */}
      <UserSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        user={null}
        onSave={handleSave}
      />
        </>
      )}
    </DesktopPageShell>
  );
}
