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
import { RoleTag } from "@/components/admin/shared/RoleTag";
import { CreateUserDialog, type NewUserDraft } from "@/components/admin/users/CreateUserDialog";
import { UserDetailPanel } from "@/components/admin/users/UserDetailPanel";
import { PasswordResetDialog } from "@/components/admin/users/PasswordResetDialog";
import { RecoveryRequestsTable } from "@/components/admin/users/RecoveryRequestsTable";
import { useRecoveryRequests } from "@/hooks/useRecoveryRequests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EMPTY_USER_METRICS,
  ROLE_LABELS,
  STATUS_LABEL,
  STATUS_TINT,
  accountStatus,
  userMetrics,
  type AccountStatus,
  type AdminUser,
  type AdminUserRole,
} from "@/data/admin/users";
import { alvaToast } from "@/lib/alva-toast";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useDevRows } from "@/hooks/use-dev-ui-state";
import { reportApiError } from "@/lib/api/reportApiError";
import { cn } from "@/lib/utils";

type Tab = "accounts" | "recovery";

type RoleFilter = AdminUserRole | "all";
type StatusFilter = "all" | AccountStatus;

export default function AdminUsersPage() {
  const {
    users,
    isLoading,
    error,
    reload,
    create,
    save,
    setActive,
    approve,
    remove,
  } = useAdminUsers();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  /* Two panels, deliberately. Clicking a row opens the record — the thing an
   * admin wants nine times out of ten — and editing is a second step from
   * inside it. A row click that drops you straight into a form makes reading
   * an account feel like you are about to change it. */
  const [detail, setDetail] = useState<AdminUser | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("accounts");
  const recovery = useRecoveryRequests();
  /* Held so the handover dialog can show the token a create or a reset
   * returned. Null while the call is in flight. */
  const [reset, setReset] = useState<{ name: string; token: string | null } | null>(
    null
  );

  const rows = useDevRows(users);
  const isEmpty = rows.length === 0;
  const metrics = isEmpty ? EMPTY_USER_METRICS : userMetrics(rows);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (roleFilter !== "all" && row.role !== roleFilter) return false;
        if (statusFilter !== "all" && accountStatus(row) !== statusFilter) {
          return false;
        }
        return true;
      }),
    [rows, roleFilter, statusFilter]
  );

  /**
   * Create, then hand over.
   *
   * `POST /users` requires a password and an admin must never choose one: a
   * password an admin knows is a password an admin can sign in with, and
   * nothing in the record would show it happened. The hook sends a generated
   * throwaway and immediately issues the single-use token the person actually
   * uses, which is what lands in the dialog below.
   */
  const handleCreate = async (draft: NewUserDraft) => {
    setReset({ name: draft.fullName, token: null });
    try {
      const { token } = await create(draft);
      setReset({ name: draft.fullName, token });
    } catch (cause) {
      setReset(null);
      const message = reportApiError(cause, "Could not create that account.");
      if (message) alvaToast.error(message);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    try {
      await remove(user.id);
      alvaToast.show(`${user.fullName} removed`, { variant: "default" });
    } catch (cause) {
      const message = reportApiError(cause, "Could not remove that account.");
      if (message) alvaToast.error(message);
    }
  };

  /* Approving turns the application into an account: it can be signed into
   * from this moment, which is the whole of what the intern is waiting for. */
  const handleApprove = async (user: AdminUser) => {
    try {
      const next = await approve(user.id);
      setDetail(next);
      alvaToast.success(`${user.fullName} approved`);
    } catch (cause) {
      const message = reportApiError(cause, "Could not approve that account.");
      if (message) alvaToast.error(message);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      const next = await setActive(user.id, !user.isActive);
      /* The panel renders from `detail`, not from the table, so an action
       * taken inside it has to update both or the status it shows goes stale
       * under the button that just changed it. */
      setDetail(next);
      alvaToast.show(
        user.isActive ? "Account deactivated" : "Account reactivated",
        { variant: "default" }
      );
    } catch (cause) {
      const message = reportApiError(cause, "Could not change that account.");
      if (message) alvaToast.error(message);
    }
  };

  const handleSave = async (user: AdminUser, draft: Partial<AdminUser>) => {
    try {
      setDetail(await save(user.id, draft));
    } catch (cause) {
      const message = reportApiError(cause, "Could not save those changes.");
      if (message) alvaToast.error(message);
    }
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
      key: "isActive",
      header: "Status",
      sortValue: (row: AdminUser) => accountStatus(row),
      /* Plain text, like the role column beside it. A row of filled pills
         down a table reads as a row of buttons, and the colour already says
         everything the background was saying twice. */
      render: (row: AdminUser) => {
        const status = accountStatus(row);
        return (
          <span
            className={cn("whitespace-nowrap text-xs font-medium", STATUS_TINT[status])}
          >
            {STATUS_LABEL[status]}
          </span>
        );
      },
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
    (roleFilter === "all" ? 0 : 1) + (statusFilter === "all" ? 0 : 1);

  return (
    <DesktopPageShell className="py-4">
      <AdminPageHeader
        id="users"
        actions={
          <div className="flex items-center gap-2">
            {/* Recovery is not self-serve: somebody asks, an admin decides,
                and the API emails the link. Without a way in here the
                requests arrived nowhere. */}
            <TextureButton
              variant="alva"
              size="sm"
              className="w-auto"
              onClick={() => setSheetOpen(true)}
            >
              <AddCircle size={15} weight="Outline" />
              New user
            </TextureButton>
          </div>
        }
      />

      {/* Inline, next to the retry, rather than a toast. A list that failed
          to load is about this page, not about the device. */}
      {error ? (
        <div
          role="alert"
          className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400"
        >
          {error}
          <button
            type="button"
            onClick={reload}
            className="shrink-0 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            Retry
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <AdminPageSkeleton charts={0} chartColumns={3} table={true} />
      ) : (
        <>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          variant="accent"
          title="Total accounts"
          value={metrics.total}
          icon={UsersGroupRounded}
        />
        <MetricCard
          title="Active"
          value={metrics.active}
          icon={CheckCircle}
        />
        <MetricCard
          title="Pending approval"
          value={metrics.pending}
          trend={{ label: "interns awaiting an admin", positive: false, neutral: true }}
          icon={ShieldUser}
        />
        <MetricCard
          title="Joined this week"
          value={metrics.joinedThisWeek}
          icon={AddCircle}
        />
      </div>

      <Tabs
        className="mt-3"
        value={tab}
        onValueChange={(value) => setTab(value as Tab)}
      >
        <TabsList className="h-9 rounded-full bg-alva-surface p-1">
          <TabsTrigger
            value="accounts"
            className="rounded-full px-4 text-sm data-[state=active]:bg-alva-card data-[state=active]:text-foreground"
          >
            Accounts
          </TabsTrigger>
          <TabsTrigger
            value="recovery"
            className="rounded-full px-4 text-sm data-[state=active]:bg-alva-card data-[state=active]:text-foreground"
          >
            <span className="flex items-center gap-2">
              Account recovery
              {/* People waiting, not a total. A queue with somebody in it
                  should say so without being opened. */}
              {recovery.rows.length > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/20 px-1.5 text-[10px] font-semibold text-amber-300">
                  {recovery.rows.length}
                </span>
              ) : null}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-2">
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
              {(["active", "pending", "deactivated", "all"] as StatusFilter[]).map(
                (value) => (
                  <DropdownMenuCheckboxItem
                    key={value}
                    checked={statusFilter === value}
                    onCheckedChange={() => setStatusFilter(value)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {value === "all" ? "All" : STATUS_LABEL[value]}
                  </DropdownMenuCheckboxItem>
                )
              )}
            </>
          }
          emptyState={{
            icon: <UsersGroupRounded size={20} weight="Outline" />,
            title: "No accounts match",
            description: "Clear the filters, or create the first one.",
          }}
        />
        </TabsContent>

        <TabsContent value="recovery" className="mt-2">
          <RecoveryRequestsTable {...recovery} />
        </TabsContent>
      </Tabs>

      <UserDetailPanel
        open={detailOpen}
        onOpenChange={setDetailOpen}
        user={detail}
        onToggleActive={handleToggleActive}
        onApprove={handleApprove}
        onDelete={handleDelete}
        onSave={handleSave}
      />

      {/* Shown after a create and after a reset: the same handover either
          way, because both end with a token somebody has to be given. */}
      <PasswordResetDialog
        open={reset !== null}
        onOpenChange={(next) => {
          if (!next) setReset(null);
        }}
        fullName={reset?.name ?? ""}
        token={reset?.token ?? null}
      />

      {/* Creating only — an existing user is edited inside the detail panel. */}
      <CreateUserDialog
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onCreate={handleCreate}
      />
        </>
      )}
    </DesktopPageShell>
  );
}
