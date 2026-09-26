// Copies pdf.js runtime data (fonts, CMaps, wasm image decoders) into public/pdfjs,
// so thumbnails render faithfully while every request stays on our own origin.
import { cp, rm } from 'node:fs/promises';

const source = new URL('../node_modules/pdfjs-dist/', import.meta.url);
const target = new URL('../public/pdfjs/', import.meta.url);

await rm(target, { recursive: true, force: true });
for (const dir of ['cmaps', 'standard_fonts', 'wasm']) {
  await cp(new URL(`${dir}/`, source), new URL(`${dir}/`, target), { recursive: true });
}
