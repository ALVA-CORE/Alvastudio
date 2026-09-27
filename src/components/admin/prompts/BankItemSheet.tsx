import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TextureButton } from "@/components/ui/texture-button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  BankItemForm,
  EMPTY_BANK_DRAFT,
  validateBankDraft,
  type BankDraft,
} from "@/components/admin/prompts/BankItemForm";
import type { BankItem, BankKind } from "@/data/admin/prompts";

export type { BankDraft };

type BankItemSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: BankKind;
  item: BankItem | null;
  onSave: (draft: BankDraft) => void;
  onRetire?: (item: BankItem) => void;
};

/**
 * Edit one bank item.
 *
 * Creating is a modal — see `CreateBankItemDialog` — and this is the panel you
 * get by opening an existing row, matching how accounts work. The fields
 * themselves come from `BankItemForm`, shared by both, so the two cannot
 * drift.
 *
 * Retiring lives here rather than as a row action, because it is the one
 * destructive thing on this page and it belongs next to the text it applies
 * to. It is a soft delete: existing recordings keep working, the item just
 * stops being handed out.
 */
export function BankItemSheet({
  open,
  onOpenChange,
  kind,
  item,
  onSave,
  onRetire,
}: BankItemSheetProps) {
  const [draft, setDraft] = useState<BankDraft>(EMPTY_BANK_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [confirmRetire, setConfirmRetire] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(
      item
        ? { text: item.text, variety: item.variety, category: item.category }
        : EMPTY_BANK_DRAFT
    );
    setError(null);
    setConfirmRetire(false);
  }, [open, item]);

  const noun = kind === "prompt" ? "prompt" : "stimulus";

  const handleSave = () => {
    const problem = validateBankDraft(draft, noun);
    if (problem) return setError(problem);
    onSave({ ...draft, text: draft.text.trim() });
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-alva-border bg-alva-card p-0 sm:max-w-md"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-alva-border px-6 pb-4 pt-6 text-left">
            <SheetTitle className="text-xl text-foreground">
              {item ? `Edit ${noun}` : `New ${noun}`}
            </SheetTitle>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {kind === "prompt"
                ? "What a contributor is asked to read aloud."
                : "What a contributor is asked to describe in their own words."}
            </p>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <BankItemForm
              kind={kind}
              draft={draft}
              error={error}
              onChange={(next) => {
                setDraft((prev) => ({ ...prev, ...next }));
                setError(null);
              }}
            />

            {item ? (
              <dl className="border-t border-alva-border pt-4">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-muted-foreground">Recorded</dt>
                  <dd className="text-xs tabular-nums text-foreground">
                    {item.usedByCount} {item.usedByCount === 1 ? "time" : "times"}
                  </dd>
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-muted-foreground">Added</dt>
                  <dd className="text-xs text-foreground">{item.createdLabel}</dd>
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-muted-foreground">Status</dt>
                  <dd className="text-xs text-foreground">
                    {item.isActive ? "Active" : "Retired"}
                  </dd>
                </div>
              </dl>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-alva-border px-6 py-4">
            <TextureButton
              variant="alva"
              size="sm"
              className="w-auto"
              onClick={handleSave}
            >
              Save changes
            </TextureButton>

            {item && item.isActive && onRetire ? (
              <button
                type="button"
                onClick={() => setConfirmRetire(true)}
                className="ml-auto rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
              >
                Retire
              </button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {item ? (
        <ConfirmDialog
          open={confirmRetire}
          onOpenChange={setConfirmRetire}
          title={`Retire this ${noun}?`}
          description={`It stops being handed out to contributors. The ${item.usedByCount} ${
            item.usedByCount === 1 ? "recording" : "recordings"
          } already made against it are unaffected, and you can bring it back at any time.`}
          confirmLabel="Retire"
          onConfirm={() => {
            onRetire?.(item);
            setConfirmRetire(false);
            onOpenChange(false);
          }}
        />
      ) : null}
    </>
  );
}
