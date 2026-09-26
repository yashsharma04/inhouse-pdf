// Renders the 1200x630 social preview image to public/og.png. Run: node scripts/make-og.mjs
import { writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="50%" cy="42%" r="45%">
      <stop offset="0%" stop-color="#2f3fb8" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#0b1026" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#0b1026"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g transform="translate(540 120)" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
    <path d="M40 0c-16 0-24 8-24 24v22c0 12-6 20-16 20 10 0 16 8 16 20v22c0 16 8 24 24 24"/>
    <path d="M80 0c16 0 24 8 24 24v22c0 12 6 20 16 20-10 0-16 8-16 20v22c0 16-8 24-24 24"/>
  </g>
  <circle cx="600" cy="186" r="14" fill="#b9c2ff"/>
  <text x="600" y="380" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="84" font-weight="700" fill="#ffffff">Quiet PDF</text>
  <text x="600" y="450" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="38" fill="#c9cde0">PDF tools that never upload your files</text>
  <text x="600" y="540" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#8c93b3">Merge · Split · Organize · Compress</text>
</svg>`;

const png = new Resvg(svg, {
  font: { loadSystemFonts: true, defaultFontFamily: 'Helvetica' },
}).render().asPng();

await writeFile(new URL('../public/og.png', import.meta.url), png);
console.log(`Wrote public/og.png (${png.length} bytes)`);
