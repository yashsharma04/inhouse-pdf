import { zipSync } from 'fflate';
import type { PdfFile } from './pdf/operations';

/** PDFs are already compressed internally, so files are stored without deflate. */
export function zipFiles(files: PdfFile[]): Uint8Array {
  const entries = Object.fromEntries(files.map((file) => [file.name, file.bytes]));
  return zipSync(entries, { level: 0 });
}
