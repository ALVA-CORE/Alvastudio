import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AlvaSelect } from "@/components/shared/AlvaSelect";
import { Label } from "@/components/ui/label";
import { TextureButton } from "@/components/ui/texture-button";
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

type BankItemSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: BankKind;
  /** Null for a new item. */
  item: BankItem | null;
  onSave: (draft: BankDraft) => void;
  onRetire?: (item: BankItem) => void;
};

const EMPTY: BankDraft = {
  text: "",
  variety: "Nigerian Pidgin",
  category: "Everyday life",
};

/**
 * Create or edit one bank item.
 *
 * Retiring is offered here rather than as a row action, because it is the one
 * destructive thing on this page and it should sit next to the text it applies
 * to. It is a soft delete — existing recordings keep working, the item just
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

  useEffect(() => {
    if (!open) return;
    setDraft(
      item
        ? { text: item.text, variety: item.variety, category: item.category }
        : EMPTY
    );
    setError(null);
  }, [open, item]);

  const noun = kind === "prompt" ? "prompt" : "stimulus";

  const handleSave = () => {
    if (!draft.text.trim()) {
      setError(`A ${noun} needs some text.`);
      return;
    }
    onSave({ ...draft, text: draft.text.trim() });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-lg flex-col border-alva-border bg-alva-card px-5 pb-6 pt-6"
      >
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="text-lg text-foreground">
            {item ? `Edit ${noun}` : `New ${noun}`}
          </SheetTitle>
          <SheetDescription>
            {kind === "prompt"
              ? "What a contributor is asked to read aloud."
              : "What a contributor is asked to describe in their own words."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <div>
            <Label htmlFor="bank-text" className="text-xs text-muted-foreground">
              Text
            </Label>
            <textarea
              id="bank-text"
              rows={5}
              value={draft.text}
              onChange={(event) => {
                setDraft((prev) => ({ ...prev, text: event.target.value }));
                setError(null);
              }}
              className={cn(alvaFieldClass, "mt-1 min-h-[7rem] resize-y py-2.5")}
              placeholder={
                kind === "prompt"
                  ? "Tell us about a market day you still remember…"
                  : "A photograph of a crowded danfo park at rush hour…"
              }
            />
            {error ? (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {error}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              {draft.text.trim().length} characters
            </p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Language variety</Label>
            <AlvaSelect
              className="mt-1"
              value={draft.variety}
              onValueChange={(value) =>
                setDraft((prev) => ({ ...prev, variety: value as Variety }))
              }
              options={VARIETIES.map((variety) => ({
                value: variety,
                label: variety,
              }))}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Category</Label>
            <AlvaSelect
              className="mt-1"
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
            <div className="rounded-xl bg-alva-surface p-3">
              <p className="text-xs text-muted-foreground">
                Recorded{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {item.usedByCount}
                </span>{" "}
                {item.usedByCount === 1 ? "time" : "times"} · added {item.createdLabel}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <TextureButton variant="alva" size="default" className="w-auto" onClick={handleSave}>
            {item ? "Save changes" : `Add ${noun}`}
          </TextureButton>

          {item && item.isActive && onRetire ? (
            <button
              type="button"
              onClick={() => {
                onRetire(item);
                onOpenChange(false);
              }}
              className="ml-auto rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
            >
              Retire
            </button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
