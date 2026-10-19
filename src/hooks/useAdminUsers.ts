import { useCallback, useEffect, useState } from "react";
import {
  approveIntern,
  createUser,
  deleteUser,
  issuePasswordReset,
  listUsers,
  previewUserDeletion,
  updateUser,
  type ApiUser,
} from "@/lib/api/users";
import { reportApiError } from "@/lib/api/reportApiError";
import { relativeDays } from "@/data/admin/shared";
import type { AdminUser, AdminUserRole } from "@/data/admin/users";
import { NO_VALUE } from "@/lib/no-value";

/** Role-appropriate noun for the panel's headline figure. */
const OUTPUT_LABEL: Record<AdminUserRole, string> = {
  contributor: "recordings",
  intern: "sessions",
  annotator: "annotations",
  admin: NO_VALUE,
};

/**
 * One API row, in the shape the table and panel already speak.
 *
 * `output` is zero here on purpose. The list endpoint does not carry a per-user
 * total and fetching one dashboard per row would be twenty requests to fill a
 * column, so the real figures are read in the panel from
 * `GET /dashboard/{role}/{id}` instead.
 */
export function fromApiUser(api: ApiUser): AdminUser {
  const created = new Date(api.created_at);

  return {
    id: api.id,
    fullName: api.full_name,
    email: api.email,
    phone: api.phone ?? "",
    role: api.role,
    isActive: api.is_active,
    createdAt: created.getTime(),
    joinedLabel: relativeDays(created),
    output: 0,
    outputLabel: OUTPUT_LABEL[api.role],
    approval:
      api.role === "intern"
        ? api.intern_approved
          ? "approved"
          : "pending"
        : undefined,
  };
}

/**
 * The admin users screen's data and every write it can make.
 *
 * Writes go to the API first and the row is replaced with what comes back,
 * rather than patched optimistically. An account list is the one screen where
 * showing a change that did not happen is worst: the next admin to look would
 * believe it.
 */
export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    listUsers({ limit: 200 })
      .then((page) => {
        if (cancelled) return;
        setUsers(page.items.map(fromApiUser));
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(reportApiError(cause, "Could not load accounts."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  const replace = useCallback((api: ApiUser) => {
    const next = fromApiUser(api);
    setUsers((prev) => prev.map((row) => (row.id === next.id ? next : row)));
    return next;
  }, []);

  /**
   * Creates the account and returns the token the person uses to get into it.
   *
   * One call. `POST /users` no longer takes a password, so the server makes
   * one nobody sees and hands back a single-use reset token — which is what
   * the dialog that called this has to pass on.
   */
  const create = useCallback(
    async (draft: {
      fullName: string;
      email: string;
      phone: string;
      role: AdminUserRole;
    }) => {
      const api = await createUser({
        email: draft.email,
        full_name: draft.fullName,
        phone: draft.phone || null,
        role: draft.role,
      });

      setUsers((prev) => [fromApiUser(api), ...prev]);

      /* The create response carries it. The separate issue call is only a
       * fallback for a server that has not caught up. */
      const token =
        api.password_reset?.token ?? (await issuePasswordReset(api.id)).token;
      return { user: fromApiUser(api), token };
    },
    []
  );

  const save = useCallback(
    async (id: string, draft: Partial<AdminUser>) =>
      replace(
        await updateUser(id, {
          full_name: draft.fullName,
          phone: draft.phone ?? null,
          role: draft.role,
        })
      ),
    [replace]
  );

  const setActive = useCallback(
    async (id: string, isActive: boolean) =>
      replace(await updateUser(id, { is_active: isActive })),
    [replace]
  );

  const approve = useCallback(
    async (id: string) => replace(await approveIntern(id)),
    [replace]
  );

  const remove = useCallback(async (id: string) => {
    await deleteUser(id);
    setUsers((prev) => prev.filter((row) => row.id !== id));
  }, []);

  return {
    users,
    isLoading,
    error,
    reload,
    create,
    save,
    setActive,
    approve,
    remove,
    previewDeletion: previewUserDeletion,
    issueReset: issuePasswordReset,
  };
}
