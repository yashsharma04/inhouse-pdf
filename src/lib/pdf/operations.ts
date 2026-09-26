import { PDFDocument, degrees } from 'pdf-lib';
import { PdfToolError } from './errors';
import { loadPdf } from './load';
import { baseName } from './names';

export interface PdfFile {
  name: string;
  bytes: Uint8Array;
}

export type Rotation = 0 | 90 | 180 | 270;

export interface PageEdit {
  /** Zero-based index of the page in the source PDF. */
  index: number;
  /** Rotation to add on top of the page's existing rotation. */
  rotation: Rotation;
}

async function copyInto(target: PDFDocument, source: PDFDocument, indices: number[]) {
  const pages = await target.copyPages(source, indices);
  for (const page of pages) target.addPage(page);
  return pages;
}

export async function mergePdfs(files: PdfFile[]): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new PdfToolError('empty-result', 'Add at least one PDF to merge.');
  }
  const merged = await PDFDocument.create();
  for (const file of files) {
    const source = await loadPdf(file.bytes, file.name);
    await copyInto(merged, source, source.getPageIndices());
  }
  return merged.save();
}

export async function extractPages(file: PdfFile, indices: number[]): Promise<Uint8Array> {
  if (indices.length === 0) {
    throw new PdfToolError('empty-result', 'Choose at least one page.');
  }
  const source = await loadPdf(file.bytes, file.name);
  const output = await PDFDocument.create();
  await copyInto(output, source, indices);
  return output.save();
}

export async function splitEveryPage(file: PdfFile): Promise<PdfFile[]> {
  const source = await loadPdf(file.bytes, file.name);
  const pageCount = source.getPageCount();
  const digits = String(pageCount).length;
  const base = baseName(file.name);

  const files: PdfFile[] = [];
  for (let index = 0; index < pageCount; index++) {
    const output = await PDFDocument.create();
    await copyInto(output, source, [index]);
    const pageNumber = String(index + 1).padStart(digits, '0');
    files.push({ name: `${base}-page-${pageNumber}.pdf`, bytes: await output.save() });
  }
  return files;
}

export async function organizePages(file: PdfFile, edits: PageEdit[]): Promise<Uint8Array> {
  if (edits.length === 0) {
    throw new PdfToolError('empty-result', 'Keep at least one page.');
  }
  const source = await loadPdf(file.bytes, file.name);
  const output = await PDFDocument.create();
  const pages = await copyInto(
    output,
    source,
    edits.map((edit) => edit.index),
  );
  pages.forEach((page, i) => {
    const added = edits[i]!.rotation;
    page.setRotation(degrees((page.getRotation().angle + added) % 360));
  });
  return output.save();
}
