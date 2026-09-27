import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import { ADMIN_USERS } from "@/data/admin/users";
import { ADMIN_ANNOTATIONS } from "@/data/admin/oversight";
import { cn } from "@/lib/utils";

/**
 * Hands a recorded session to a named annotator.
 *
 * The queue is claim-based by default — annotators take the next thing
 * themselves — and that is right for steady work. This is the override: a
 * session that has sat unclaimed, or one that needs a particular person,
 * because it is in a variety only two of them work in.
 *
 * The list is ordered by current load, lightest first, so the default choice
 * is the one that will actually start soonest.
 */
export function AssignAnnotatorDialog({
  open,
  onOpenChange,
  /** What is being handed over — a topic, or "3 sessions". */
  subject,
  onAssign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string | null;
  onAssign: (annotatorName: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const annotators = useMemo(() => {
    const load = new Map<string, number>();
    for (const annotation of ADMIN_ANNOTATIONS) {
      if (annotation.status === "approved") continue;
      load.set(annotation.annotator, (load.get(annotation.annotator) ?? 0) + 1);
    }

    return ADMIN_USERS.filter((user) => user.role === "annotator" && user.isActive)
      .map((user) => ({ ...user, open: load.get(user.fullName) ?? 0 }))
      .sort((a, b) => a.open - b.open);
  }, []);

  if (!subject) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelected(null);
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={cn(
          "flex max-h-[80vh] max-w-md flex-col gap-0 overflow-hidden rounded-3xl border-alva-border bg-alva-card p-0",
          "[&>button]:hidden"
        )}
      >
        <div className="shrink-0 border-b border-alva-border px-6 pb-4 pt-6">
          <DialogTitle className="text-xl text-foreground">Assign to</DialogTitle>
          <DialogDescription className="mt-1 truncate text-sm text-muted-foreground">
            {subject}
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {annotators.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No active annotators. Create one from the Users page first.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {annotators.map((annotator) => {
                const isSelected = selected === annotator.fullName;
                return (
                  <li key={annotator.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(annotator.fullName)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent",
                        isSelected ? "bg-alva-surface" : "hover:bg-alva-surface/60"
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-foreground">
                          {annotator.fullName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {annotator.email}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 whitespace-nowrap text-xs tabular-nums",
                          annotator.open === 0
                            ? "text-alva-accent"
                            : "text-muted-foreground"
                        )}
                      >
                        {annotator.open === 0 ? "free" : `${annotator.open} open`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-alva-border px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
          >
            Cancel
          </button>
          <TextureButton
            variant="alva"
            size="sm"
            className="w-auto"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              onAssign(selected);
              setSelected(null);
              onOpenChange(false);
            }}
          >
            Assign
          </TextureButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
