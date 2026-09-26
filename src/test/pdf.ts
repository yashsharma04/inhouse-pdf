import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';

/** Page i gets width 100 + i, so page order is observable after any operation. */
export async function makePdf(pageCount: number, widthOffset = 0): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([100 + widthOffset + i, 300]);
  }
  return doc.save();
}

export async function pageWidths(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => page.getWidth());
}

export async function pageRotations(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => page.getRotation().angle);
}

export function readFixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));
}
