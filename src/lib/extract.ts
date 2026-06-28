import "server-only";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

const PDF = "application/pdf";
const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Extract plain text from a résumé so the AI can assess it cheaply (text instead
 * of a PDF document block) and staff can read it inline.
 *
 * Returns null when no usable text exists — legacy .doc, an image-only/scanned
 * PDF, or any extraction failure — so callers can keep prior text and prompt for
 * a paste instead of storing an empty string.
 */
export async function extractResumeText(
  bytes: ArrayBuffer | Uint8Array,
  mimeType: string,
): Promise<string | null> {
  try {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (mimeType === PDF) {
      const pdf = await getDocumentProxy(data);
      const { text } = await extractText(pdf, { mergePages: true });
      const merged = Array.isArray(text) ? text.join("\n") : text;
      return merged.trim() || null;
    }
    if (mimeType === DOCX) {
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(data) });
      return value.trim() || null;
    }
    // Legacy .doc and anything else: no reliable text extraction.
    return null;
  } catch {
    return null;
  }
}

/** Convenience wrapper for a File pulled from a server-action FormData. */
export async function extractResumeTextFromFile(
  file: File,
): Promise<string | null> {
  return extractResumeText(await file.arrayBuffer(), file.type);
}
