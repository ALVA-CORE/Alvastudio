import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlvaSelect } from "@/components/shared/AlvaSelect";
import { TextureButton } from "@/components/ui/texture-button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { alvaFieldClass } from "@/lib/alva-form-styles";
import {
  BANK_CATEGORIES,
  type BankCategory,
  type BankItem,
  type BankKind,
} from "@/data/admin/prompts";
import { VARIETIES, type Variety } from "@/data/admin/shared";
import { cn } from "@/lib/utils";

export type BankDraft = {
  text: string;
  variety: Variety;
  category: BankCategory;
};

const EMPTY: BankDraft = {
  text: "",
  variety: "Nigerian Pidgin",
  category: "Everyday life",
};

/** Roughly two spoken sentences — past this a prompt stops being readable aloud. */
const SOFT_LIMIT = 220;

type BankItemSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: BankKind;
  /** Null for a new item. */
  item: BankItem | null;
  onSave: (draft: BankDraft) => void;
  onRetire?: (item: BankItem) => void;
};

/**
 * Create or edit one bank item.
 *
 * Same three-band shape as the other detail sheets — divided header, scrolling
 * body, divided footer — so it reads as part of the set rather than a form
 * that happened to open from the side.
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
  const [draft, setDraft] = useState<BankDraft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [confirmRetire, setConfirmRetire] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(
      item ? { text: item.text, variety: item.variety, category: item.category } : EMPTY
    );
    setError(null);
    setConfirmRetire(false);
  }, [open, item]);

  const noun = kind === "prompt" ? "prompt" : "stimulus";
  const length = draft.text.trim().length;

  const handleSave = () => {
    if (!length) {
      setError(`A ${noun} needs some text.`);
      return;
    }
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

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div>
              <label
                htmlFor="bank-text"
                className="block text-xs text-muted-foreground"
              >
                Text
              </label>
              {/* `resize-none`: the native grabber let the box be dragged over
                  its own label, and a prompt long enough to need more room is
                  already too long to read aloud. */}
              <textarea
                id="bank-text"
                rows={5}
                value={draft.text}
                onChange={(event) => {
                  setDraft((prev) => ({ ...prev, text: event.target.value }));
                  setError(null);
                }}
                className={cn(
                  alvaFieldClass(Boolean(error)),
                  "mt-1.5 h-auto w-full resize-none px-3 py-2.5 text-sm leading-relaxed"
                )}
                placeholder={
                  kind === "prompt"
                    ? "Tell us about a market day you still remember…"
                    : "A photograph of a crowded danfo park at rush hour…"
                }
              />
              <div className="mt-1.5 flex items-baseline justify-between gap-3">
                {error ? (
                  <p role="alert" className="text-xs text-destructive">
                    {error}
                  </p>
                ) : (
                  <span />
                )}
                <span
                  className={cn(
                    "shrink-0 text-xs tabular-nums",
                    length > SOFT_LIMIT ? "text-amber-300" : "text-muted-foreground"
                  )}
                >
                  {length}
                  {length > SOFT_LIMIT ? " — long for one breath" : " characters"}
                </span>
              </div>
            </div>

            <div>
              <span className="block text-xs text-muted-foreground">
                Language variety
              </span>
              <AlvaSelect
                aria-label="Language variety"
                className="mt-1.5"
                value={draft.variety}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, variety: value as Variety }))
                }
                options={VARIETIES.map((variety) => ({ value: variety, label: variety }))}
              />
            </div>

            <div>
              <span className="block text-xs text-muted-foreground">Category</span>
              <AlvaSelect
                aria-label="Category"
                className="mt-1.5"
                value={draft.category}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, category: value as BankCategory }))
                }
                options={BANK_CATEGORIES.map((category) => ({
                  value: category,
                  label: category,
                }))}
              />
            </div>

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
              {item ? "Save changes" : `Add ${noun}`}
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
