import { AlvaSelect } from "@/components/shared/AlvaSelect";
import { FieldBeam } from "@/components/shared/FieldBeam";
import { alvaFieldClass } from "@/lib/alva-form-styles";
import {
  type BankKind,
} from "@/data/admin/prompts";
import { VARIETIES, type Variety } from "@/data/admin/shared";
import { cn } from "@/lib/utils";

/**
 * What an admin can actually change: the words and the variety.
 *
 * Not the category — that is which bank the item lives in, and moving it means
 * a delete and a create, which loses the id every recording points at.
 */
export type BankDraft = {
  text: string;
  variety: Variety;
};

export const EMPTY_BANK_DRAFT: BankDraft = {
  text: "",
  variety: "Nigerian Pidgin",
};

/** Roughly two spoken sentences — past this a prompt stops being readable aloud. */
const SOFT_LIMIT = 220;

export function validateBankDraft(draft: BankDraft, noun: string): string | null {
  return draft.text.trim() ? null : `A ${noun} needs some text.`;
}

/**
 * The three fields a bank item has.
 *
 * Shared by the create modal and the edit panel so the two cannot drift —
 * adding a field to one and forgetting the other is exactly the bug a split
 * form invites.
 */
export function BankItemForm({
  kind,
  draft,
  onChange,
  error,
}: {
  kind: BankKind;
  draft: BankDraft;
  onChange: (next: Partial<BankDraft>) => void;
  error: string | null;
}) {
  const length = draft.text.trim().length;

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="bank-text" className="block text-xs text-muted-foreground">
          Text
        </label>
        {/* `resize-none`: the native grabber let the box be dragged over its
            own label, and a prompt long enough to need more room is already
            too long to read aloud. */}
        <FieldBeam className="mt-1.5">
          <textarea
            id="bank-text"
            rows={5}
            value={draft.text}
            onChange={(event) => onChange({ text: event.target.value })}
            className={cn(
              alvaFieldClass(Boolean(error)),
              "block h-auto w-full resize-none px-3 py-2.5 text-sm leading-relaxed focus-visible:border-transparent"
            )}
            placeholder={
              kind === "prompt"
                ? "Tell us about a market day you still remember…"
                : "A photograph of a crowded danfo park at rush hour…"
            }
          />
        </FieldBeam>
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
            {length > SOFT_LIMIT ? ", long for one breath" : " characters"}
          </span>
        </div>
      </div>

      {/* Two short choices, side by side — stacked they pushed the footer off
          the modal for no gain. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <span className="block text-xs text-muted-foreground">Language variety</span>
          <AlvaSelect
            aria-label="Language variety"
            className="mt-1.5"
            value={draft.variety}
            onValueChange={(value) => onChange({ variety: value as Variety })}
            options={VARIETIES.map((variety) => ({ value: variety, label: variety }))}
          />
        </div>

        {/* No category picker.
            Prompts and stimuli are separate endpoints, so what an item is was
            decided by the tab it was created from. Offering it as a field let
            somebody set "Stimuli" on a prompt and then wonder why it stayed in
            the Prompts tab — changing it for real would mean deleting from one
            bank and creating in the other, which loses the id every recording
            points at. */}
      </div>
    </div>
  );
}
