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
import {
  bankRowsToCsv,
  parseBankCsv,
  BANK_CSV_TEMPLATE,
  type BankCsvRow,
} from "@/lib/admin/bankCsv";
import type { BankKind } from "@/data/admin/prompts";
import { downloadCsv } from "@/lib/download-csv";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BankCsvPreviewTable } from "@/components/admin/prompts/BankCsvPreviewTable";

type View = "table" | "text";

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
  /**
   * Handed a file, but not the one the person picked.
   *
   * `POST /{bank}/import` wants `text,language_variety,category` with the
   * API's enum values, and refuses a whole file over a header called
   * `variety`. So the rows the preview found are rewritten into that shape
   * and sent instead. The server still does its own validation, including
   * duplicate detection against the existing bank, and its answer is the
   * one that counts.
   */
  onImport: (file: File, rows: BankCsvRow[]) => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [view, setView] = useState<View>("text");
  const [sending, setSending] = useState(false);

  const noun = kind === "prompt" ? "prompts" : "stimuli";
  const parsed = useMemo(() => parseBankCsv(raw), [raw]);

  const readFile = async (picked: File | undefined) => {
    if (!picked) return;
    setFileName(picked.name);
    setRaw(await picked.text());
    setView("table");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setRaw("");
          setFileName(null);
          setView("text");
          setSending(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={cn(
          "flex max-h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden rounded-3xl border-alva-border bg-alva-card p-0",
          "[&>button]:hidden"
        )}
      >
        <div className="shrink-0 border-b border-alva-border px-6 pb-4 pt-6">
          <DialogTitle className="text-xl text-foreground">Import {noun}</DialogTitle>
          <DialogDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">
            One per line, with a header row naming{" "}
            <span className="text-foreground">text</span>,{" "}
            <span className="text-foreground">variety</span> and{" "}
            <span className="text-foreground">category</span>, in any order.
            Variety can be written as &ldquo;Nigerian English&rdquo; or just
            &ldquo;Pidgin&rdquo;, and is Pidgin when left blank. Category is
            optional.
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

          {/* Two views of one thing. Text is where a paste goes and where a
              stray quote is easiest to spot; the table is what will actually
              be imported, and where a picked file lands. */}
          {/* Nothing to tabulate once the text is cleared, so it falls back
              to where the next paste goes. */}
          <Tabs
            value={raw.trim() ? view : "text"}
            onValueChange={(value) => setView(value as View)}
          >
            <TabsList className="h-9 rounded-full bg-alva-surface p-1">
              <TabsTrigger
                value="table"
                disabled={!raw.trim()}
                className="rounded-full px-4 text-sm data-[state=active]:bg-alva-card data-[state=active]:text-foreground"
              >
                Table
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="rounded-full px-4 text-sm data-[state=active]:bg-alva-card data-[state=active]:text-foreground"
              >
                Text
              </TabsTrigger>
            </TabsList>

            <TabsContent value="table" className="mt-3">
              <BankCsvPreviewTable rows={parsed.rows} problems={parsed.problems} />
            </TabsContent>

            <TabsContent value="text" className="mt-3">
              <label htmlFor="bank-csv" className="sr-only">
                CSV text
              </label>
              <FieldBeam>
                <textarea
                  id="bank-csv"
                  rows={9}
                  value={raw}
                  onChange={(event) => setRaw(event.target.value)}
                  className={cn(
                    alvaFieldClass(),
                    "block h-auto w-full resize-none px-3 py-2.5 font-mono text-xs leading-relaxed focus-visible:border-transparent"
                  )}
                  placeholder={`Or paste it here\n\n${BANK_CSV_TEMPLATE}`}
                />
              </FieldBeam>
            </TabsContent>
          </Tabs>

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
                    {parsed.skipped.length === 1 ? "line" : "lines"} skipped,{" "}
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
            loading={sending}
            onClick={async () => {
              setSending(true);
              try {
                await onImport(
                  new File([bankRowsToCsv(parsed.rows)], fileName ?? `${noun}.csv`, {
                    type: "text/csv",
                  }),
                  parsed.rows
                );
                onOpenChange(false);
              } finally {
                /* Without this, a throw from `onImport` leaves the button
                   spinning for good. It handles its own errors today, which
                   is not a reason to depend on it. */
                setSending(false);
              }
            }}
          >
            Add {parsed.rows.length || ""} {noun}
          </TextureButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
