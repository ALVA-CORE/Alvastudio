import { useEffect, useRef, useState } from "react";
import { UserDetailPanel } from "@/components/admin/users/UserDetailPanel";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { alvaToast } from "@/lib/alva-toast";
import { reportApiError } from "@/lib/api/reportApiError";
import type { AdminUser } from "@/data/admin/users";

/**
 * Somebody's user panel, opened from another screen by their id.
 *
 * There is no `GET /users/{id}`, and the panel needs the account itself
 * (email, phone, status), so the account list is read the first time a
 * person is opened here, not before. With the actions the users page gives
 * the same panel.
 */
export function UserPanelHost({
  userId,
  onClose,
}: {
  userId: string | null;
  onClose: () => void;
}) {
  /* On from the first person opened, and stays on: the list is read once. */
  const wanted = useRef(false);
  if (userId) wanted.current = true;

  const { users, isLoading, error, setActive, approve, remove, save } = useAdminUsers(wanted.current);
  const [detail, setDetail] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (!userId) {
      setDetail(null);
      return;
    }
    /* Not yet read: an empty list here means "not loaded", not "missing".
       There is always at least one account, the admin looking. */
    if (isLoading || (users.length === 0 && !error)) return;
    const found = users.find((user) => user.id === userId) ?? null;
    if (!found) {
      alvaToast.error(error ?? "That account is no longer there");
      onClose();
    }
    setDetail(found);
  }, [userId, users, isLoading, error, onClose]);

  const report = (cause: unknown, fallback: string) => {
    const message = reportApiError(cause, fallback);
    if (message) alvaToast.error(message);
  };

  return (
    <UserDetailPanel
      open={detail !== null}
      onOpenChange={(open) => !open && onClose()}
      user={detail}
      onToggleActive={async (user) => {
        try {
          setDetail(await setActive(user.id, !user.isActive));
          alvaToast.show(user.isActive ? "Account deactivated" : "Account reactivated", {
            variant: "default",
          });
        } catch (cause) {
          report(cause, "Could not change that account.");
        }
      }}
      onApprove={async (user) => {
        try {
          setDetail(await approve(user.id));
          alvaToast.success(`${user.fullName} approved`);
        } catch (cause) {
          report(cause, "Could not approve that account.");
        }
      }}
      onDelete={async (user) => {
        try {
          await remove(user.id);
          alvaToast.show(`${user.fullName} removed`, { variant: "default" });
          onClose();
        } catch (cause) {
          report(cause, "Could not remove that account.");
        }
      }}
      onSave={async (user, draft) => {
        try {
          setDetail(await save(user.id, draft));
        } catch (cause) {
          report(cause, "Could not save those changes.");
        }
      }}
    />
  );
}
