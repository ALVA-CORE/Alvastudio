import { useMemo } from "react";
import { AssignPicker } from "@/components/admin/shared/AssignPicker";
import { useAssignableStaff } from "@/hooks/useAssignableStaff";

/**
 * Hands a clip to a different reviewer.
 *
 * Interns review, and admins can. Reassigning to whoever already has it is a
 * no-op, so they are filtered out rather than offered and rejected.
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
  /** The current reviewer — reassigning to them changes nothing. */
  exclude?: string;
  onAssign: (reviewer: { id: string; name: string }) => void;
}) {
  const { people, isLoading } = useAssignableStaff(["intern", "admin"], open);

  const offered = useMemo(
    () => people.filter((person) => person.name !== exclude),
    [people, exclude]
  );

  return (
    <AssignPicker
      open={open}
      onOpenChange={onOpenChange}
      title="Reassign to"
      subject={subject}
      people={offered}
      emptyMessage={
        isLoading
          ? "Loading reviewers…"
          : "No other active reviewers. Create one from the Users page first."
      }
      onAssign={onAssign}
    />
  );
}
