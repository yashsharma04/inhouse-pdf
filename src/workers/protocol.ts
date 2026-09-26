import type { CompressionLevel, CompressResult } from '../lib/compress/ghostscript';
import type { PdfErrorCode } from '../lib/pdf/errors';
import type { PageEdit, PdfFile } from '../lib/pdf/operations';

/**
 * Maps job kinds to their input and output. Each worker serves one such map.
 * Maps are declared as type aliases (not interfaces extending JobMap) so the
 * index signature doesn't widen their keys.
 */
export type JobMap = Record<string, { input: unknown; output: unknown }>;

export type PdfJobs = {
  inspect: { input: { file: PdfFile }; output: { pageCount: number } };
  merge: { input: { files: PdfFile[] }; output: Uint8Array };
  extract: { input: { file: PdfFile; indices: number[] }; output: Uint8Array };
  /** Output is a zip of single-page PDFs. */
  splitEvery: { input: { file: PdfFile }; output: Uint8Array };
  organize: { input: { file: PdfFile; edits: PageEdit[] }; output: Uint8Array };
};

export type CompressJobs = {
  compress: { input: { file: PdfFile; level: CompressionLevel }; output: CompressResult };
};

export interface JobRequest {
  id: number;
  kind: string;
  input: unknown;
}

export type JobResponse =
  | { id: number; ok: true; output: unknown }
  | { id: number; ok: false; error: { code?: PdfErrorCode; message: string } };

/** The part of Worker / MessagePort used by the job client and host. */
export interface MessageEndpoint {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
}
