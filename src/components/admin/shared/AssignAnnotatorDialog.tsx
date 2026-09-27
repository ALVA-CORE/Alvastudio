import { useMemo } from "react";
import { AssignPicker } from "@/components/admin/shared/AssignPicker";
import { ADMIN_USERS } from "@/data/admin/users";
import { ADMIN_ANNOTATIONS } from "@/data/admin/oversight";

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
  onAssign: (annotatorName: string) => void;
}) {
  const people = useMemo(() => {
    const load = new Map<string, number>();
    for (const annotation of ADMIN_ANNOTATIONS) {
      if (annotation.status === "approved") continue;
      load.set(annotation.annotator, (load.get(annotation.annotator) ?? 0) + 1);
    }

    return ADMIN_USERS.filter(
      (user) => user.role === "annotator" && user.isActive
    ).map((user) => ({
      id: user.id,
      name: user.fullName,
      detail: user.email,
      load: load.get(user.fullName) ?? 0,
    }));
  }, []);

  return (
    <AssignPicker
      open={open}
      onOpenChange={onOpenChange}
      title="Assign to"
      subject={subject}
      people={people}
      emptyMessage="No active annotators. Create one from the Users page first."
      onAssign={onAssign}
    />
  );
}
