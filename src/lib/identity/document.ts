/**
 * Turning a chosen file into the body `POST /wallet/identity/documents` wants.
 *
 * Four rules come from the API, and three of them are easy to break by
 * accident:
 *
 *  - The bytes must match `document_content_type`. Re-encoding a PNG through
 *    a canvas and still declaring `image/png` sends JPEG bytes under a PNG
 *    label, which is rejected after the upload rather than before it.
 *  - **Both sides must use the same declared type.** A JPEG front and a PDF
 *    back is not a submission the API can describe, so it is refused here,
 *    where the person can still fix it by reselecting.
 *  - Each base64 string is capped at 4,194,304 characters. A modern phone
 *    photo blows past that, so images are downscaled rather than refused.
 *  - A PDF cannot be re-encoded, only measured. If it is over the cap there
 *    is nothing to do but say so.
 *
 * Nothing here writes to storage, and nothing returns the file. The base64
 * lives in React state until the request goes, and the caller clears it.
 */

/** The API's own limit, in base64 characters. About 3 MiB decoded. */
export const MAX_BASE64_CHARS = 4_194_304;

/**
 * The longest edge of a photographed document.
 *
 * Bigger than the old selfie's 720px on purpose: a person has to read the
 * small print on an ID card, and 1600px is the difference between a legible
 * document number and a resubmission. Still roughly 300-500KB of base64,
 * which is a fraction of the cap and survives a Nigerian mobile connection.
 */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.86;

export const ACCEPTED_TYPES = "image/jpeg,image/png,application/pdf";

/** What one side of the document became once it was read. */
export type EncodedDocument = {
  /** Bare base64. No `data:` prefix — the API decodes this as the file. */
  base64: string;
  /** What `document_content_type` must say. */
  contentType: "image/jpeg" | "application/pdf";
  /** For the preview. Null for a PDF, which has nothing to show inline. */
  previewUrl: string | null;
  /** The person's own filename, so a PDF has something to be labelled by. */
  name: string;
};

export class DocumentError extends Error {}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new DocumentError("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

/** The payload only. The API decodes this, so the `data:...;base64,` header
 *  would go through the decoder as if it were file content. */
function payloadOf(dataUrl: string): string {
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

/**
 * Draws onto a canvas at a sane size and returns JPEG base64.
 *
 * Always JPEG, whatever went in, which is why the declared type is a constant
 * rather than read off the file: the bytes coming out of `toDataURL` are what
 * the API will check, not the bytes that went in.
 */
function downscaleToJpeg(image: HTMLImageElement): string {
  const scale = Math.min(
    1,
    MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight)
  );

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const context = canvas.getContext("2d");
  if (!context) throw new DocumentError("Could not read that image.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return payloadOf(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
}

/**
 * Reads one chosen file.
 *
 * Images become JPEG regardless of what they arrived as, so a PNG front and a
 * JPEG back agree on a type without the person being told to convert
 * anything. PDFs pass through untouched, because there is no honest way to
 * shrink one in a browser.
 */
export async function encodeDocument(file: File): Promise<EncodedDocument> {
  const isPdf = file.type === "application/pdf";
  const isImage = file.type.startsWith("image/");

  if (!isPdf && !isImage) {
    throw new DocumentError("Choose a photo or a PDF of your ID.");
  }

  const dataUrl = await readAsDataUrl(file);

  if (isPdf) {
    const base64 = payloadOf(dataUrl);
    if (base64.length > MAX_BASE64_CHARS) {
      /* Nothing we can do about it, so say what would work instead of
         offering a retry that fails the same way. */
      throw new DocumentError(
        "That PDF is too large. Try a photo of the ID instead."
      );
    }
    return { base64, contentType: "application/pdf", previewUrl: null, name: file.name };
  }

  const image = new Image();
  image.src = dataUrl;
  try {
    await image.decode();
  } catch {
    throw new DocumentError("Could not read that photo. Try another one.");
  }

  const base64 = downscaleToJpeg(image);
  if (base64.length > MAX_BASE64_CHARS) {
    throw new DocumentError("That photo is too large, even shrunk. Try another one.");
  }

  return {
    base64,
    contentType: "image/jpeg",
    previewUrl: `data:image/jpeg;base64,${base64}`,
    name: file.name,
  };
}

/**
 * Why these two sides cannot be submitted together, or null if they can.
 *
 * Checked before the request rather than after it, because the fix is to pick
 * a different file and that is only obvious while the picker is still in
 * reach.
 */
export function mismatchReason(
  front: EncodedDocument,
  back: EncodedDocument | null
): string | null {
  if (!back) return null;
  if (back.contentType === front.contentType) return null;

  return front.contentType === "application/pdf"
    ? "The front is a PDF, so the back has to be one too."
    : "The back is a PDF but the front is a photo. Use the same kind for both.";
}
