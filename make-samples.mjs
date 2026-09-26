import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { writeFileSync, copyFileSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';
async function textPdf(name, pages, color) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  for (let i = 1; i <= pages; i++) {
    const p = doc.addPage([595, 842]);
    p.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color });
    p.drawText(`${name} — page ${i}`, { x: 60, y: 700, size: 40, font, color: rgb(1, 1, 1) });
    p.drawText(String(i), { x: 250, y: 350, size: 200, font, color: rgb(1, 1, 1) });
  }
  writeFileSync(`/tmp/qpdf-samples/${name}.pdf`, await doc.save());
}
await textPdf('alpha', 3, rgb(0.2, 0.3, 0.7));
await textPdf('beta', 2, rgb(0.7, 0.3, 0.2));
// photo-like image heavy pdf
const size = 2000; const px = new Uint8Array(size*size*3); let s = 7;
for (let y=0;y<size;y++) for (let x=0;x<size;x++){ const b=128+60*Math.sin(x/50)*Math.cos(y/70); for(let c=0;c<3;c++){ s=(Math.imul(s,1664525)+1013904223)>>>0; px[(y*size+x)*3+c]=b+((s>>>28)-8)+c*25; } }
const rows = Buffer.alloc((size*3+1)*size); for (let y=0;y<size;y++) rows.set(px.subarray(y*size*3,(y+1)*size*3), y*(size*3+1)+1);
const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const b=Buffer.concat([Buffer.from(t),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc32(b)>>>0);return Buffer.concat([l,b,c]);};
const h=Buffer.alloc(13);h.writeUInt32BE(size,0);h.writeUInt32BE(size,4);h[8]=8;h[9]=2;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
const doc = await PDFDocument.create(); const img = await doc.embedPng(png); const font = await doc.embedFont(StandardFonts.Helvetica);
for (let i=0;i<2;i++){ const p=doc.addPage([595,842]); p.drawImage(img,{x:48,y:200,width:500,height:500}); p.drawText(`Scanned page ${i+1} with selectable text`,{x:48,y:760,size:20,font}); }
writeFileSync('/tmp/qpdf-samples/photo-scan.pdf', await doc.save());
copyFileSync('src/test/fixtures/encrypted.pdf', '/tmp/qpdf-samples/locked.pdf');
writeFileSync('/tmp/qpdf-samples/notes.txt', 'not a pdf');
