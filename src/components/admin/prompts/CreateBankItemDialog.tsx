import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import {
  BankItemForm,
  EMPTY_BANK_DRAFT,
  validateBankDraft,
  type BankDraft,
} from "@/components/admin/prompts/BankItemForm";
import type { BankKind } from "@/data/admin/prompts";
import { cn } from "@/lib/utils";

/**
 * Add one prompt or stimulus.
 *
 * A modal, matching the create-account flow: adding is short and
 * self-contained, and the side panel is what reading and editing an existing
 * item looks like. Two panels from the same edge doing different jobs was the
 * confusing part.
 */
export function CreateBankItemDialog({
  open,
  onOpenChange,
  kind,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: BankKind;
  onCreate: (draft: BankDraft) => void;
}) {
  const [draft, setDraft] = useState<BankDraft>(EMPTY_BANK_DRAFT);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(EMPTY_BANK_DRAFT);
    setError(null);
  }, [open]);

  const noun = kind === "prompt" ? "prompt" : "stimulus";

  const submit = () => {
    const problem = validateBankDraft(draft, noun);
    if (problem) return setError(problem);
    onCreate({ ...draft, text: draft.text.trim() });
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
          <DialogTitle className="text-xl text-foreground">New {noun}</DialogTitle>
          <DialogDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {kind === "prompt"
              ? "What a contributor is asked to read aloud."
              : "What a contributor is asked to describe in their own words."}
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <BankItemForm
            kind={kind}
            draft={draft}
            error={error}
            onChange={(next) => {
              setDraft((prev) => ({ ...prev, ...next }));
              setError(null);
            }}
          />
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
            Add {noun}
          </TextureButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
