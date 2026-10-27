import { describe, expect, it } from "vitest";
import {
  encodeDocument,
  mismatchReason,
  type EncodedDocument,
} from "@/lib/identity/document";

/* `HTMLCanvasElement.toDataURL` and `HTMLImageElement.decode` are stubbed in
 * `src/test/setup.ts` — jsdom implements neither, and the whole point of this
 * module is what comes out of them. The stub returns a JPEG data URL. */

const jpeg = () => new File(["jpeg-bytes"], "front.jpg", { type: "image/jpeg" });
const png = () => new File(["png-bytes"], "back.png", { type: "image/png" });
const pdf = () => new File(["%PDF-1.4"], "nin.pdf", { type: "application/pdf" });

describe("encodeDocument", () => {
  it("strips the data: prefix, which the API would decode as file content", async () => {
    const encoded = await encodeDocument(jpeg());
    expect(encoded.base64).not.toContain("data:");
    expect(encoded.base64).not.toContain(",");
  });

  /* The declared type has to describe the bytes, not the file that was
     picked. Everything goes through a canvas and comes out JPEG, so a PNG
     declared as `image/png` would be a lie about its own payload. */
  it("declares JPEG for a PNG, because that is what it re-encodes to", async () => {
    const encoded = await encodeDocument(png());
    expect(encoded.contentType).toBe("image/jpeg");
  });

  it("passes a PDF through untouched, with no preview to show", async () => {
    const encoded = await encodeDocument(pdf());
    expect(encoded.contentType).toBe("application/pdf");
    expect(encoded.previewUrl).toBeNull();
    expect(encoded.name).toBe("nin.pdf");
  });

  it("refuses a file that is neither a photo nor a PDF", async () => {
    const docx = new File(["x"], "scan.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    await expect(encodeDocument(docx)).rejects.toThrow(/photo or a PDF/);
  });
});

describe("mismatchReason", () => {
  const as = (contentType: EncodedDocument["contentType"]): EncodedDocument => ({
    base64: "AAAA",
    contentType,
    previewUrl: null,
    name: "x",
  });

  it("allows a document with only a front", () => {
    expect(mismatchReason(as("image/jpeg"), null)).toBeNull();
  });

  /* Two photos agree even if one arrived as a PNG, because both were
     re-encoded. That is the reason the conversion is unconditional. */
  it("allows two images", () => {
    expect(mismatchReason(as("image/jpeg"), as("image/jpeg"))).toBeNull();
  });

  /* The API takes ONE `document_content_type` for both sides, so a mixed
     pair cannot be described at all. Caught here, where the picker is still
     in reach, rather than as a 422 after the upload. */
  it("names which side is wrong, both ways round", () => {
    expect(mismatchReason(as("application/pdf"), as("image/jpeg"))).toMatch(
      /front is a PDF/
    );
    expect(mismatchReason(as("image/jpeg"), as("application/pdf"))).toMatch(
      /back is a PDF/
    );
  });
});
