import { useEffect, useState } from "react";
import Letter from "@solar-icons/react/messages/Letter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlvaSelect } from "@/components/shared/AlvaSelect";
import { TextureButton } from "@/components/ui/texture-button";
import { alvaFieldClass } from "@/lib/alva-form-styles";
import {
  ADMIN_PERMISSIONS,
  CREATABLE_ROLES,
  DEFAULT_ADMIN_PERMISSIONS,
  ROLE_LABELS,
  type AdminPermission,
  type AdminUserRole,
} from "@/data/admin/users";
import { cn } from "@/lib/utils";

export type NewUserDraft = {
  fullName: string;
  email: string;
  phone: string;
  role: AdminUserRole;
  permissions: AdminPermission[];
};

const EMPTY: NewUserDraft = {
  fullName: "",
  email: "",
  phone: "",
  role: "annotator",
  permissions: DEFAULT_ADMIN_PERMISSIONS,
};

/**
 * Create a staff account.
 *
 * A modal rather than a side panel: creating is a short, self-contained task
 * with nothing behind it worth keeping in view, and the side panel is already
 * what reading and editing an existing account looks like. Two panels doing
 * different jobs from the same edge was the confusing part.
 *
 * There is no password field. The account is created inactive and the person
 * sets their own password from the invite — an admin who can read a colleague's
 * password is a liability, and one typed into a form gets reused.
 */
export function CreateUserDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (draft: NewUserDraft) => void;
}) {
  const [draft, setDraft] = useState<NewUserDraft>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(EMPTY);
    setError(null);
  }, [open]);

  const patch = (next: Partial<NewUserDraft>) => {
    setDraft((prev) => ({ ...prev, ...next }));
    setError(null);
  };

  const togglePermission = (id: AdminPermission) => {
    setDraft((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(id)
        ? prev.permissions.filter((entry) => entry !== id)
        : [...prev.permissions, id],
    }));
  };

  const submit = () => {
    if (!draft.fullName.trim()) return setError("A name is required.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email)) {
      return setError("That does not look like an email address.");
    }
    onCreate({
      ...draft,
      fullName: draft.fullName.trim(),
      email: draft.email.trim(),
      permissions: draft.role === "admin" ? draft.permissions : [],
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[85vh] max-w-lg flex-col gap-0 overflow-hidden rounded-3xl border-alva-border bg-alva-card p-0",
          "[&>button]:hidden"
        )}
      >
        <div className="shrink-0 border-b border-alva-border px-6 pb-4 pt-6">
          <DialogTitle className="text-xl text-foreground">New account</DialogTitle>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label htmlFor="new-name" className="block text-xs text-muted-foreground">
              Full name
            </label>
            <Input
              id="new-name"
              value={draft.fullName}
              onChange={(event) => patch({ fullName: event.target.value })}
              className={cn(alvaFieldClass(), "mt-1.5")}
              placeholder="Chioma Okafor"
            />
          </div>

          <div>
            <label htmlFor="new-email" className="block text-xs text-muted-foreground">
              Email
            </label>
            <Input
              id="new-email"
              type="email"
              value={draft.email}
              onChange={(event) => patch({ email: event.target.value })}
              className={cn(alvaFieldClass(), "mt-1.5")}
              placeholder="name@alvacoreai.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="new-phone" className="block text-xs text-muted-foreground">
                Phone
              </label>
              <Input
                id="new-phone"
                value={draft.phone}
                onChange={(event) => patch({ phone: event.target.value })}
                className={cn(alvaFieldClass(), "mt-1.5")}
                placeholder="08012345678"
              />
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Role</span>
              <AlvaSelect
                aria-label="Role"
                className="mt-1.5"
                value={draft.role}
                onValueChange={(value) => patch({ role: value as AdminUserRole })}
                options={CREATABLE_ROLES.map((role) => ({
                  value: role,
                  label: ROLE_LABELS[role],
                }))}
              />
            </div>
          </div>

          {/* Only admins have anything to scope — every other role's reach is
              fixed by the role itself. */}
          {draft.role === "admin" ? (
            <div className="border-t border-alva-border pt-4">
              <p className="text-sm font-medium text-foreground">Page access</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Which admin areas this account can open. Everything is off by
                default except the read-only views.
              </p>

              <div className="mt-3 space-y-1">
                {ADMIN_PERMISSIONS.map((permission) => {
                  const checked = draft.permissions.includes(permission.id);
                  return (
                    <label
                      key={permission.id}
                      className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-alva-surface"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(permission.id)}
                        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-alva-accent"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm text-foreground">
                          {permission.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {permission.detail}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex items-start gap-3 rounded-xl bg-alva-surface p-3">
            <Letter
              size={17}
              weight="BoldDuotone"
              className="mt-0.5 shrink-0 text-alva-accent"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              An invite goes to{" "}
              <span className="text-foreground">{draft.email || "their email"}</span>.
              They set their own password from the link; it is never shown here.
            </p>
          </div>

          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-alva-border px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            Cancel
          </button>
          <TextureButton variant="alva" size="sm" className="w-auto" onClick={submit}>
            Send invite
          </TextureButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
