import { describe, expect, it } from 'vitest';
import { makePdf, readFixture } from '../../test/pdf';
import { PdfToolError } from './errors';
import { assertPdfBytes, loadPdf } from './load';

async function captureError(promise: Promise<unknown>): Promise<PdfToolError> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(PdfToolError);
  return error as PdfToolError;
}

describe('assertPdfBytes', () => {
  it('accepts bytes that start with %PDF-', async () => {
    expect(() => assertPdfBytes(new TextEncoder().encode('%PDF-1.7 rest'), 'a.pdf')).not.toThrow();
  });

  it('rejects other bytes and names the file', () => {
    const run = () => assertPdfBytes(new TextEncoder().encode('hello'), 'notes.txt');
    expect(run).toThrow(PdfToolError);
    expect(run).toThrow('"notes.txt" isn\'t a PDF file.');
  });

  it('rejects files shorter than the header', () => {
    expect(() => assertPdfBytes(new Uint8Array([0x25, 0x50]), 'tiny.pdf')).toThrow(PdfToolError);
  });
});

describe('loadPdf', () => {
  it('loads a valid PDF', async () => {
    const doc = await loadPdf(await makePdf(3), 'three.pdf');
    expect(doc.getPageCount()).toBe(3);
  });

  it('reports non-PDF input with code not-pdf', async () => {
    const error = await captureError(loadPdf(new TextEncoder().encode('nope'), 'x.png'));
    expect(error.code).toBe('not-pdf');
  });

  it('reports password-protected PDFs with code encrypted', async () => {
    const error = await captureError(loadPdf(readFixture('encrypted.pdf'), 'locked.pdf'));
    expect(error.code).toBe('encrypted');
    expect(error.message).toBe(
      '"locked.pdf" is password-protected. Remove the password and try again.',
    );
  });

  it('reports damaged PDFs with code corrupt and keeps the cause', async () => {
    const bytes = new TextEncoder().encode('%PDF-1.7\nthis is not a real pdf body');
    const error = await captureError(loadPdf(bytes, 'broken.pdf'));
    expect(error.code).toBe('corrupt');
    expect(error.message).toBe('We couldn\'t read "broken.pdf". The file may be damaged.');
    expect(error.cause).toBeDefined();
  });
});
