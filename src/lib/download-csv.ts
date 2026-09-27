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
