export type PdfErrorCode =
  | 'not-pdf'
  | 'encrypted'
  | 'corrupt'
  | 'invalid-range'
  | 'empty-result'
  | 'already-optimized';

/** An expected failure whose `message` is safe to show to the user as-is. */
export class PdfToolError extends Error {
  readonly code: PdfErrorCode;

  constructor(code: PdfErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PdfToolError';
    this.code = code;
  }
}
