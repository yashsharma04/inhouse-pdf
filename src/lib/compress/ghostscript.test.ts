import loadGhostscript from '@okathira/ghostpdl-wasm';
import { PDFDocument } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import { makePdf, readFixture } from '../../test/pdf';
import { compressPdf, type Ghostscript } from './ghostscript';

/**
 * A single page holding a high-resolution photo-like image (smooth shapes plus grain):
 * lossless PNG stores it poorly, Ghostscript's downsampling and JPEG shrink it a lot.
 */
async function makeImageHeavyPdf(): Promise<Uint8Array> {
  const size = 1600;
  const canvas = new Uint8Array(size * size * 3);
  let seed = 42;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const base = 128 + 60 * Math.sin(x / 40) * Math.cos(y / 55);
      for (let channel = 0; channel < 3; channel++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const grain = (seed >>> 28) - 8;
        canvas[(y * size + x) * 3 + channel] = base + grain + channel * 20;
      }
    }
  }
  const doc = await PDFDocument.create();
  const image = await doc.embedPng(encodeRgbPng(canvas, size, size));
  doc.addPage([612, 792]).drawImage(image, { x: 56, y: 146, width: 500, height: 500 });
  return doc.save();
}

function encodeRgbPng(rgb: Uint8Array, width: number, height: number): Uint8Array {
  const { deflateSync, crc32 } = require('node:zlib') as typeof import('node:zlib');
  const rows = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    rows[y * (width * 3 + 1)] = 0;
    rows.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1);
  }
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

describe('compressPdf', () => {
  let gs: Ghostscript;
  let stderr = '';
  const readStderr = () => {
    const text = stderr;
    stderr = '';
    return text;
  };

  beforeAll(async () => {
    gs = await loadGhostscript({
      print: () => {},
      printErr: (text: string) => {
        stderr += `${text}\n`;
      },
    });
  });

  it('makes an image-heavy PDF smaller and keeps it a valid PDF', async () => {
    const input = { name: 'scan.pdf', bytes: await makeImageHeavyPdf() };
    const result = await compressPdf(gs, input, 'strong', readStderr);

    expect(result.originalSize).toBe(input.bytes.length);
    expect(result.compressedSize).toBe(result.bytes.length);
    expect(result.compressedSize).toBeLessThan(result.originalSize);
    const reparsed = await PDFDocument.load(result.bytes);
    expect(reparsed.getPageCount()).toBe(1);
  });

  it('can run several jobs on one Ghostscript instance', async () => {
    const input = { name: 'scan.pdf', bytes: await makeImageHeavyPdf() };
    const first = await compressPdf(gs, input, 'strong', readStderr);
    const second = await compressPdf(gs, input, 'strong', readStderr);
    expect(second.compressedSize).toBe(first.compressedSize);
    expect(gs.FS.readdir('/')).not.toContain('input.pdf');
    expect(gs.FS.readdir('/')).not.toContain('output.pdf');
  });

  it('reports already-optimized files instead of returning a bigger one', async () => {
    const tiny = { name: 'tiny.pdf', bytes: await makePdf(1) };
    await expect(compressPdf(gs, tiny, 'light', readStderr)).rejects.toMatchObject({
      code: 'already-optimized',
    });
  });

  it('rejects password-protected PDFs before running Ghostscript', async () => {
    const locked = { name: 'locked.pdf', bytes: readFixture('encrypted.pdf') };
    await expect(compressPdf(gs, locked, 'recommended', readStderr)).rejects.toMatchObject({
      code: 'encrypted',
    });
  });
});
