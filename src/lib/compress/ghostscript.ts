import { PdfToolError } from '../pdf/errors';
import { loadPdf } from '../pdf/load';
import type { PdfFile } from '../pdf/operations';

export const COMPRESSION_LEVELS = ['light', 'recommended', 'strong'] as const;
export type CompressionLevel = (typeof COMPRESSION_LEVELS)[number];

const PDF_SETTINGS: Record<CompressionLevel, string> = {
  light: '/printer',
  recommended: '/ebook',
  strong: '/screen',
};

const INPUT_FILE = 'input.pdf';
const OUTPUT_FILE = 'output.pdf';

/**
 * The parts of the Ghostscript module this code uses. The published build is
 * closure-compiled and strips most FS helpers (e.g. analyzePath), so only
 * methods verified to exist are listed here.
 */
export interface Ghostscript {
  callMain(args: string[]): number;
  FS: {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
    readdir(path: string): string[];
    unlink(path: string): void;
  };
}

export interface CompressResult {
  bytes: Uint8Array;
  originalSize: number;
  compressedSize: number;
}

/**
 * Compresses a PDF with Ghostscript's pdfwrite device.
 * `readStderr` returns (and clears) Ghostscript's error output for diagnostics.
 */
export async function compressPdf(
  gs: Ghostscript,
  file: PdfFile,
  level: CompressionLevel,
  readStderr: () => string,
): Promise<CompressResult> {
  // Same validation and error messages as the other tools (not a PDF, encrypted, damaged).
  await loadPdf(file.bytes, file.name);

  gs.FS.writeFile(`/${INPUT_FILE}`, file.bytes);
  try {
    const exitCode = gs.callMain([
      '-sDEVICE=pdfwrite',
      `-dPDFSETTINGS=${PDF_SETTINGS[level]}`,
      '-dCompatibilityLevel=1.5',
      '-dNOPAUSE',
      '-dBATCH',
      '-dQUIET',
      `-sOutputFile=/${OUTPUT_FILE}`,
      `/${INPUT_FILE}`,
    ]);
    if (exitCode !== 0) {
      throw new Error(`Ghostscript exited with code ${exitCode}: ${readStderr()}`);
    }

    const bytes = gs.FS.readFile(`/${OUTPUT_FILE}`);
    if (bytes.length >= file.bytes.length) {
      throw new PdfToolError(
        'already-optimized',
        `"${file.name}" is already well optimized. Compressing it wouldn't make it smaller.`,
      );
    }
    return { bytes, originalSize: file.bytes.length, compressedSize: bytes.length };
  } finally {
    const present = gs.FS.readdir('/');
    for (const name of [INPUT_FILE, OUTPUT_FILE]) {
      if (present.includes(name)) gs.FS.unlink(`/${name}`);
    }
  }
}
