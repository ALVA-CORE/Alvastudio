import { ROLE_LABELS, type AdminUserRole } from "@/data/admin/users";
import { cn } from "@/lib/utils";

/**
 * Role, as coloured text.
 *
 * Not a pill. Every row in the table has a role, so a filled chip on every row
 * draws twenty boxes down the column and the colour stops meaning anything —
 * a pill earns its background by being exceptional, and this never is. Colour
 * alone separates the four roles, and the weight keeps it legible.
 */
const ROLE_COLOR: Record<AdminUserRole, string> = {
  admin: "text-amber-300",
  annotator: "text-alva-accent",
  intern: "text-sky-300",
  contributor: "text-muted-foreground",
};

export function RoleTag({
  role,
  className,
}: {
  role: AdminUserRole;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "whitespace-nowrap text-sm font-medium",
        ROLE_COLOR[role],
        className
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
