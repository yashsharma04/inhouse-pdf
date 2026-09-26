import { PDFDocument, degrees } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { makePdf, pageRotations, pageWidths } from '../../test/pdf';
import { PdfToolError } from './errors';
import { extractPages, mergePdfs, organizePages, splitEveryPage } from './operations';

describe('mergePdfs', () => {
  it('concatenates all pages in input order', async () => {
    const a = { name: 'a.pdf', bytes: await makePdf(2, 0) }; // widths 100, 101
    const b = { name: 'b.pdf', bytes: await makePdf(3, 50) }; // widths 150, 151, 152
    expect(await pageWidths(await mergePdfs([b, a]))).toEqual([150, 151, 152, 100, 101]);
  });

  it('names the offending file when one input is invalid', async () => {
    const good = { name: 'good.pdf', bytes: await makePdf(1) };
    const bad = { name: 'photo.jpg', bytes: new Uint8Array([1, 2, 3, 4, 5]) };
    await expect(mergePdfs([good, bad])).rejects.toThrow('"photo.jpg" isn\'t a PDF file.');
  });

  it('rejects an empty input list', async () => {
    await expect(mergePdfs([])).rejects.toBeInstanceOf(PdfToolError);
  });
});

describe('extractPages', () => {
  it('builds a PDF from the given page indices in order', async () => {
    const input = { name: 'doc.pdf', bytes: await makePdf(5) };
    expect(await pageWidths(await extractPages(input, [4, 0, 2]))).toEqual([104, 100, 102]);
  });

  it('rejects an empty selection', async () => {
    const input = { name: 'doc.pdf', bytes: await makePdf(2) };
    await expect(extractPages(input, [])).rejects.toMatchObject({ code: 'empty-result' });
  });
});

describe('splitEveryPage', () => {
  it('returns one single-page PDF per page, named after the source', async () => {
    const files = await splitEveryPage({ name: 'Report.PDF', bytes: await makePdf(3) });
    expect(files.map((file) => file.name)).toEqual([
      'Report-page-1.pdf',
      'Report-page-2.pdf',
      'Report-page-3.pdf',
    ]);
    const widths = await Promise.all(files.map((file) => pageWidths(file.bytes)));
    expect(widths).toEqual([[100], [101], [102]]);
  });

  it('zero-pads page numbers so files sort correctly', async () => {
    const files = await splitEveryPage({ name: 'big.pdf', bytes: await makePdf(12) });
    expect(files[0]?.name).toBe('big-page-01.pdf');
    expect(files[11]?.name).toBe('big-page-12.pdf');
  });
});

describe('organizePages', () => {
  it('reorders, drops omitted pages, and adds rotation', async () => {
    const input = { name: 'doc.pdf', bytes: await makePdf(4) };
    const output = await organizePages(input, [
      { index: 3, rotation: 90 },
      { index: 0, rotation: 0 },
      { index: 2, rotation: 270 },
    ]);
    expect(await pageWidths(output)).toEqual([103, 100, 102]);
    expect(await pageRotations(output)).toEqual([90, 0, 270]);
  });

  it('adds to rotation the page already had, wrapping at 360', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([100, 100]).setRotation(degrees(270));
    const input = { name: 'rotated.pdf', bytes: await doc.save() };
    const output = await organizePages(input, [{ index: 0, rotation: 180 }]);
    expect(await pageRotations(output)).toEqual([90]);
  });

  it('rejects removing every page', async () => {
    const input = { name: 'doc.pdf', bytes: await makePdf(2) };
    await expect(organizePages(input, [])).rejects.toMatchObject({
      code: 'empty-result',
      message: 'Keep at least one page.',
    });
  });
});
