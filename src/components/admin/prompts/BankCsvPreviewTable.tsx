import DangerTriangle from "@solar-icons/react/ui/DangerTriangle";
import type { BankCsvProblem, BankCsvRow } from "@/lib/admin/bankCsv";
import { cn } from "@/lib/utils";

/**
 * Past this many lines the table stops drawing and says how many more.
 * A bank is capped at 5,000 rows by the API, and drawing all of them in a
 * dialog to be scrolled past is not a preview anyone reads.
 */
const MAX_SHOWN = 300;

type Line =
  | { kind: "row"; line: number; row: BankCsvRow }
  | { kind: "problem"; line: number; problem: BankCsvProblem };

/**
 * What the import will send, line by line, in the order of the file.
 *
 * Skipped lines sit where they were, with the reason, rather than in a list
 * underneath. "Line 41: no text" means more next to lines 40 and 42.
 */
export function BankCsvPreviewTable({
  rows,
  problems,
}: {
  rows: BankCsvRow[];
  problems: BankCsvProblem[];
}) {
  const lines: Line[] = [
    ...rows.map((row): Line => ({ kind: "row", line: row.line, row })),
    ...problems.map((problem): Line => ({ kind: "problem", line: problem.line, problem })),
  ].sort((a, b) => a.line - b.line);

  const shown = lines.slice(0, MAX_SHOWN);

  return (
    <div className="alva-thin-scrollbar max-h-[22rem] overflow-auto rounded-xl border border-alva-border">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 z-[1] bg-alva-surface text-muted-foreground">
          <tr>
            <th scope="col" className="w-12 px-3 py-2 font-medium tabular-nums">
              Line
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Text
            </th>
            <th scope="col" className="w-20 px-3 py-2 font-medium">
              Variety
            </th>
            <th scope="col" className="w-32 px-3 py-2 font-medium">
              Category
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.map((entry) => (
            <tr
              key={`${entry.kind}-${entry.line}`}
              className={cn(
                "border-t border-alva-border/60 align-top",
                entry.kind === "problem" && "bg-amber-400/[0.06]"
              )}
            >
              <td className="px-3 py-2 tabular-nums text-muted-foreground">{entry.line}</td>
              {entry.kind === "row" ? (
                <>
                  <td className="px-3 py-2 leading-relaxed text-foreground">{entry.row.text}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {entry.row.variety === "Nigerian English" ? "English" : "Pidgin"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {entry.row.category || <span className="opacity-50">—</span>}
                  </td>
                </>
              ) : (
                <td colSpan={3} className="px-3 py-2">
                  <span className="flex items-start gap-1.5 text-amber-300">
                    <DangerTriangle
                      size={13}
                      weight="BoldDuotone"
                      className="mt-px shrink-0"
                      aria-hidden
                    />
                    Skipped: {entry.problem.reason}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {lines.length > MAX_SHOWN ? (
        <p className="border-t border-alva-border px-3 py-2 text-xs text-muted-foreground">
          And {(lines.length - MAX_SHOWN).toLocaleString()} more lines, all checked and
          counted below.
        </p>
      ) : null}
    </div>
  );
}
