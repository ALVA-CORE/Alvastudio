import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AlvaSelect } from "@/components/shared/AlvaSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TextureButton } from "@/components/ui/texture-button";
import { PanelDivider, PanelRow, PanelSection } from "@/components/shared/PanelPrimitives";
import { alvaFieldClass } from "@/lib/alva-form-styles";
import { ROLE_LABELS, type AdminUser, type AdminUserRole } from "@/data/admin/users";
import { cn } from "@/lib/utils";

export type UserDraft = {
  fullName: string;
  email: string;
  phone: string;
  role: AdminUserRole;
};

const EMPTY: UserDraft = {
  fullName: "",
  email: "",
  phone: "",
  role: "contributor",
};

const ROLES: AdminUserRole[] = ["contributor", "intern", "annotator", "admin"];

/**
 * Create a user, or look at one.
 *
 * Creating is the point. `annotator` cannot be self-registered and neither can
 * `admin`, so without this screen the only way to make either is a database
 * row or an env var — which is where the project is today.
 */
export function UserSheet({
  open,
  onOpenChange,
  user,
  onSave,
  onToggleActive,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null for a new user. */
  user: AdminUser | null;
  onSave: (draft: UserDraft) => void;
  onToggleActive?: (user: AdminUser) => void;
}) {
  const [draft, setDraft] = useState<UserDraft>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(
      user
        ? {
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            role: user.role,
          }
        : EMPTY
    );
    setError(null);
  }, [open, user]);

  const handleSave = () => {
    if (!draft.fullName.trim()) return setError("A name is required.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email)) {
      return setError("That does not look like an email address.");
    }
    onSave({ ...draft, fullName: draft.fullName.trim(), email: draft.email.trim() });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-lg flex-col border-alva-border bg-alva-card px-5 pb-6 pt-6"
      >
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="text-lg text-foreground">
            {user ? user.fullName : "New user"}
          </SheetTitle>
          <SheetDescription>
            {user
              ? `${ROLE_LABELS[user.role]} · joined ${user.joinedLabel}`
              : "Staff roles cannot be self-registered, so they are created here."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <div>
            <Label htmlFor="user-name" className="text-xs text-muted-foreground">
              Full name
            </Label>
            <Input
              id="user-name"
              value={draft.fullName}
              onChange={(event) => {
                setDraft((prev) => ({ ...prev, fullName: event.target.value }));
                setError(null);
              }}
              className={cn(alvaFieldClass, "mt-1")}
              placeholder="Chioma Okafor"
            />
          </div>

          <div>
            <Label htmlFor="user-email" className="text-xs text-muted-foreground">
              Email
            </Label>
            <Input
              id="user-email"
              type="email"
              value={draft.email}
              onChange={(event) => {
                setDraft((prev) => ({ ...prev, email: event.target.value }));
                setError(null);
              }}
              className={cn(alvaFieldClass, "mt-1")}
              placeholder="name@alvacoreai.com"
            />
          </div>

          <div>
            <Label htmlFor="user-phone" className="text-xs text-muted-foreground">
              Phone
            </Label>
            <Input
              id="user-phone"
              value={draft.phone}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, phone: event.target.value }))
              }
              className={cn(alvaFieldClass, "mt-1")}
              placeholder="08012345678"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Role</Label>
            <AlvaSelect
              className="mt-1"
              value={draft.role}
              onValueChange={(value) =>
                setDraft((prev) => ({ ...prev, role: value as AdminUserRole }))
              }
              options={ROLES.map((role) => ({
                value: role,
                label: ROLE_LABELS[role],
              }))}
            />
            {draft.role === "admin" ? (
              <p className="mt-1.5 text-xs text-amber-300">
                An admin can create and remove any other account, change rates
                and see every contributor's earnings.
              </p>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}

          {user ? (
            <>
              <PanelDivider />
              <PanelSection title="Activity">
                <dl>
                  <PanelRow label="Joined" value={user.joinedLabel} />
                  <PanelRow
                    label={
                      user.outputLabel === "—"
                        ? "Output"
                        : user.outputLabel[0].toUpperCase() + user.outputLabel.slice(1)
                    }
                    value={user.outputLabel === "—" ? "—" : String(user.output)}
                  />
                  <PanelRow
                    label="Status"
                    value={user.isActive ? "Active" : "Deactivated"}
                  />
                </dl>
              </PanelSection>
            </>
          ) : null}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <TextureButton variant="alva" size="default" className="w-auto" onClick={handleSave}>
            {user ? "Save changes" : "Create user"}
          </TextureButton>

          {user && onToggleActive ? (
            <button
              type="button"
              onClick={() => {
                onToggleActive(user);
                onOpenChange(false);
              }}
              className={cn(
                "ml-auto rounded-full px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent",
                user.isActive
                  ? "text-muted-foreground hover:text-red-400"
                  : "text-muted-foreground hover:text-alva-accent"
              )}
            >
              {user.isActive ? "Deactivate" : "Reactivate"}
            </button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
