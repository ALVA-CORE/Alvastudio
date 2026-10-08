import { useMemo, useRef, useState } from "react";
import Upload from "@solar-icons/react/arrows-action/Upload";
import DangerTriangle from "@solar-icons/react/ui/DangerTriangle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import { FieldBeam } from "@/components/shared/FieldBeam";
import { alvaFieldClass } from "@/lib/alva-form-styles";
import { parseBankCsv, BANK_CSV_TEMPLATE } from "@/lib/admin/bankCsv";
import type { BankKind } from "@/data/admin/prompts";
import type { BankDraft } from "@/components/admin/prompts/BankItemForm";
import { downloadCsv } from "@/lib/download-csv";
import { cn } from "@/lib/utils";

/**
 * Load a bank from a spreadsheet.
 *
 * A linguist writing 200 prompts writes them in a spreadsheet, not one at a
 * time in a modal. This takes the file, or pasted text, and shows what it
 * found before anything is added — a silent import of 200 rows with three
 * broken ones is worse than no import.
 */
export function ImportBankCsvDialog({
  open,
  onOpenChange,
  kind,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: BankKind;
  onImport: (drafts: BankDraft[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState("");

  const noun = kind === "prompt" ? "prompts" : "stimuli";
  const parsed = useMemo(() => parseBankCsv(raw), [raw]);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setRaw(await file.text());
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setRaw("");
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={cn(
          "flex max-h-[85vh] max-w-xl flex-col gap-0 overflow-hidden rounded-3xl border-alva-border bg-alva-card p-0",
          "[&>button]:hidden"
        )}
      >
        <div className="shrink-0 border-b border-alva-border px-6 pb-4 pt-6">
          <DialogTitle className="text-xl text-foreground">Import {noun}</DialogTitle>
          <DialogDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">
            One per line. Columns are <span className="text-foreground">text</span>,{" "}
            <span className="text-foreground">variety</span> and{" "}
            <span className="text-foreground">category</span> — the last two are
            optional and fall back to Pidgin and Everyday life.
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="sr-only"
              onChange={(event) => void readFile(event.target.files?.[0])}
            />
            <TextureButton
              variant="minimal"
              size="sm"
              className="w-auto"
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={15} weight="Outline" />
              Choose a CSV
            </TextureButton>
            <button
              type="button"
              onClick={() => downloadCsv(`alva-${noun}-template.csv`, BANK_CSV_TEMPLATE)}
              className="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
            >
              Download template
            </button>
          </div>

          <div>
            <label htmlFor="bank-csv" className="block text-xs text-muted-foreground">
              Or paste it here
            </label>
            <FieldBeam className="mt-1.5">
              <textarea
                id="bank-csv"
                rows={7}
                value={raw}
                onChange={(event) => setRaw(event.target.value)}
                className={cn(
                  alvaFieldClass(),
                  "block h-auto w-full resize-none px-3 py-2.5 font-mono text-xs leading-relaxed focus-visible:border-transparent"
                )}
                placeholder={BANK_CSV_TEMPLATE}
              />
            </FieldBeam>
          </div>

          {raw.trim() ? (
            <div className="rounded-xl bg-alva-surface p-3">
              <p className="text-sm text-foreground">
                <span className="tabular-nums">{parsed.rows.length}</span>{" "}
                {parsed.rows.length === 1 ? "row" : "rows"} ready
              </p>

              {parsed.skipped.length > 0 ? (
                <div className="mt-2 flex items-start gap-2">
                  <DangerTriangle
                    size={15}
                    weight="BoldDuotone"
                    className="mt-0.5 shrink-0 text-amber-300"
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {parsed.skipped.length}{" "}
                    {parsed.skipped.length === 1 ? "line" : "lines"} skipped —{" "}
                    {parsed.skipped.slice(0, 3).join("; ")}
                    {parsed.skipped.length > 3 ? "…" : ""}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
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
            disabled={parsed.rows.length === 0}
            onClick={() => {
              onImport(parsed.rows);
              onOpenChange(false);
            }}
          >
            Add {parsed.rows.length || ""} {noun}
          </TextureButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
