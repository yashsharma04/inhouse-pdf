// Regenerates binary test fixtures in src/test/fixtures. Run: node scripts/make-fixtures.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import loadGhostscript from '@okathira/ghostpdl-wasm';
import { PDFDocument } from 'pdf-lib';

const outDir = new URL('../src/test/fixtures/', import.meta.url);
await mkdir(outDir, { recursive: true });

const plain = await PDFDocument.create();
plain.addPage([200, 200]);
const plainBytes = await plain.save();

const gs = await loadGhostscript();
gs.FS.writeFile('plain.pdf', plainBytes);
const exitCode = gs.callMain([
  '-sDEVICE=pdfwrite',
  '-dNOPAUSE',
  '-dBATCH',
  '-dQUIET',
  '-sOwnerPassword=owner',
  '-sUserPassword=user',
  '-sOutputFile=encrypted.pdf',
  'plain.pdf',
]);
if (exitCode !== 0) throw new Error(`Ghostscript exited with ${exitCode}`);

await writeFile(new URL('encrypted.pdf', outDir), gs.FS.readFile('encrypted.pdf'));
console.log('Wrote src/test/fixtures/encrypted.pdf');
