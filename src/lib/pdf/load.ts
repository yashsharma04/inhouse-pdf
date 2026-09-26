import { PDFDocument } from 'pdf-lib';
import { PdfToolError } from './errors';

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

export function assertPdfBytes(bytes: Uint8Array, fileName: string): void {
  const isPdf = PDF_MAGIC.every((byte, i) => bytes[i] === byte);
  if (!isPdf) {
    throw new PdfToolError('not-pdf', `"${fileName}" isn't a PDF file.`);
  }
}

export async function loadPdf(bytes: Uint8Array, fileName: string): Promise<PDFDocument> {
  assertPdfBytes(bytes, fileName);

  let doc: PDFDocument;
  try {
    // pdf-lib's EncryptedPDFError can't be detected with instanceof (ES5 Error subclass),
    // so encryption is checked via `isEncrypted` instead.
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    // Forces the page tree to be parsed so damaged files fail here, not mid-operation.
    doc.getPageCount();
  } catch (error) {
    throw new PdfToolError('corrupt', `We couldn't read "${fileName}". The file may be damaged.`, {
      cause: error,
    });
  }

  if (doc.isEncrypted) {
    throw new PdfToolError(
      'encrypted',
      `"${fileName}" is password-protected. Remove the password and try again.`,
    );
  }
  return doc;
}
