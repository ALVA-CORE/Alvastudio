/**
 * Hands the browser a CSV without a round trip.
 *
 * A Blob URL rather than a `data:` URI: a payment run is thousands of rows, and
 * `data:` URIs hit a length ceiling in some browsers well before that. The URL
 * is revoked on the next frame — revoking it synchronously races the download
 * in WebKit.
 */
export function downloadCsv(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

type CsvValue = string | number | boolean | null | undefined;

/**
 * One cell, safe for both a CSV parser and a spreadsheet.
 *
 * Quoted when it holds a comma, quote or line break. A cell that a
 * spreadsheet would run as a formula (`=`, `@`, or a sign in front of
 * something other than a number) gets a leading apostrophe. Names and emails
 * are typed by the public, and opening an export should not run anything.
 * A phone number like `+234…` is left alone.
 */
export function csvCell(value: CsvValue): string {
  if (value == null) return "";
  let text = String(value);
  if (/^[=@\t\r]/.test(text) || /^[+-](?![\d\s.])/.test(text)) {
    text = `'${text}`;
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Rows to CSV text, header first.
 *
 * Starts with a byte-order mark so Excel reads it as UTF-8. Without one,
 * a name like "Ọlá" comes out as mojibake.
 */
export function toCsv(header: string[], rows: CsvValue[][]): string {
  return (
    "\ufeff" +
    [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")
  );
}
