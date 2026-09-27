import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import { cn } from "@/lib/utils";

export type AssignablePerson = {
  id: string;
  name: string;
  detail?: string;
  /** Open items they already hold. Drives the ordering. */
  load: number;
};

/**
 * Pick one person to hand something to.
 *
 * Shared by every assignment on the surface — annotator, reviewer — because
 * the decision is identical each time: who is free enough to start this now.
 * The list is ordered lightest-first so the default choice is the one that
 * will actually get picked up, rather than whoever happens to sort first
 * alphabetically.
 */
export function AssignPicker({
  open,
  onOpenChange,
  title,
  subject,
  people,
  emptyMessage,
  onAssign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** What is being handed over — a topic, a code, "3 sessions". */
  subject: string | null;
  people: AssignablePerson[];
  emptyMessage: string;
  onAssign: (name: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  if (!subject) return null;

  const ordered = [...people].sort((a, b) => a.load - b.load);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[80vh] max-w-md flex-col gap-0 overflow-hidden rounded-3xl border-alva-border bg-alva-card p-0",
          "[&>button]:hidden"
        )}
      >
        <div className="shrink-0 border-b border-alva-border px-6 pb-4 pt-6">
          <DialogTitle className="text-xl text-foreground">{title}</DialogTitle>
          <DialogDescription className="mt-1 truncate text-sm text-muted-foreground">
            {subject}
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {ordered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {ordered.map((person) => {
                const isSelected = selected === person.name;
                return (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(person.name)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent",
                        isSelected ? "bg-alva-surface" : "hover:bg-alva-surface/60"
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-foreground">
                          {person.name}
                        </span>
                        {person.detail ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {person.detail}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 whitespace-nowrap text-xs tabular-nums",
                          person.load === 0 ? "text-alva-accent" : "text-muted-foreground"
                        )}
                      >
                        {person.load === 0 ? "free" : `${person.load} open`}
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
