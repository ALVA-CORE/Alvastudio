import { AssignPicker } from "@/components/admin/shared/AssignPicker";
import { useAssignableStaff } from "@/hooks/useAssignableStaff";

/**
 * Hands a recorded session to a named annotator.
 *
 * The queue is claim-based by default — annotators take the next thing
 * themselves — and that is right for steady work. This is the override: a
 * session that has sat unclaimed, or one that needs a particular person
 * because it is in a variety only two of them work in.
 */
export function AssignAnnotatorDialog({
  open,
  onOpenChange,
  subject,
  onAssign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string | null;
  onAssign: (annotator: { id: string; name: string }) => void;
}) {
  const { people, isLoading } = useAssignableStaff(["annotator"], open);

  return (
    <AssignPicker
      open={open}
      onOpenChange={onOpenChange}
      title="Assign to"
      subject={subject}
      people={people}
      emptyMessage={
        isLoading
          ? "Loading annotators…"
          : "No active annotators. Create one from the Users page first."
      }
      onAssign={onAssign}
    />
  );
}
