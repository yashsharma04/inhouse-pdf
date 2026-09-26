import { PdfToolError } from '../lib/pdf/errors';

export const GENERIC_ERROR = 'Something went wrong while processing the PDF.';

export function toUserMessage(error: unknown): string {
  if (error instanceof PdfToolError) return error.message;
  console.error(error);
  return error instanceof Error && error.message === GENERIC_ERROR ? error.message : GENERIC_ERROR;
}
