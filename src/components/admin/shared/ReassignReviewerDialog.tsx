import { useMemo } from "react";
import { AssignPicker } from "@/components/admin/shared/AssignPicker";
import { ADMIN_USERS } from "@/data/admin/users";
import { ADMIN_RECORDINGS } from "@/data/admin/oversight";

/**
 * Hands a clip to a different reviewer.
 *
 * Interns review; the load count is how many clips they are already holding a
 * verdict on, so the lightest-loaded is offered first.
 */
export function ReassignReviewerDialog({
  open,
  onOpenChange,
  subject,
  exclude,
  onAssign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string | null;
  /** The current reviewer — reassigning to them is a no-op. */
  exclude?: string;
  onAssign: (reviewer: string) => void;
}) {
  const people = useMemo(() => {
    const load = new Map<string, number>();
    for (const recording of ADMIN_RECORDINGS) {
      if (!recording.reviewer || recording.status === "approved") continue;
      load.set(recording.reviewer, (load.get(recording.reviewer) ?? 0) + 1);
    }

    return ADMIN_USERS.filter(
      (user) =>
        (user.role === "intern" || user.role === "admin") &&
        user.isActive &&
        user.fullName !== exclude
    ).map((user) => ({
      id: user.id,
      name: user.fullName,
      detail: user.email,
      load: load.get(user.fullName) ?? 0,
    }));
  }, [exclude]);

  return (
    <AssignPicker
      open={open}
      onOpenChange={onOpenChange}
      title="Reassign to"
      subject={subject}
      people={people}
      emptyMessage="No other active reviewers. Create one from the Users page first."
      onAssign={onAssign}
    />
  );
}
