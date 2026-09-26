# Quiet PDF — Design

Date: 2026-09-26
Status: Approved

## Goal

Private PDF tools that run entirely in the browser. Files never leave the user's device.
First product in the Quiet Labs family (after qnote). Differentiator: provable privacy,
clean UX, and one SEO landing page per tool.

## Scope (v1)

- Merge PDFs
- Split PDF (page ranges → one PDF, or every page → zip)
- Organize PDF (reorder, rotate, delete pages)
- Compress PDF (Ghostscript WASM)

Out of scope for v1: JPG→PDF, PDF→JPG, sign, offline/PWA, paid tier.

## Stack

- Astro (static output) + React islands for interactive tools + TypeScript
- `pdf-lib` for merge/split/organize
- `pdfjs-dist` for page thumbnails
- `@okathira/ghostpdl-wasm` (Ghostscript 10.x, AGPL-3.0) for compression
- `fflate` for zipping split output
- Vitest + React Testing Library
- Cloudflare Pages hosting (same as qnote)

Licensing: Ghostscript is AGPL-3.0, so the whole app is AGPL-3.0 with a public source link
(personal GitHub) in the footer and About page.

## Pages

- `/` — promise + grid of tools
- `/merge-pdf`, `/split-pdf`, `/organize-pdf`, `/compress-pdf`
- `/about` — privacy explanation, source link, license and library credits
- `404`

Every tool page: H1 + one-line promise → tool island → "How it works" (3 steps) →
FAQ (static HTML + FAQPage JSON-LD) → links to other tools.

Shared layout: header (logo, tool links), footer (privacy line, source link, "by Quiet Labs", tip link).

Product name and domain live in one config file (`src/site.ts`). Working name: "Quiet PDF".

## Tool UX

- Merge: drop several PDFs → drag to reorder files → merge → download `merged.pdf`.
- Split: ranges mode (`1-3, 5` → one PDF) or every-page mode (→ zip of single-page PDFs).
- Organize: thumbnail grid → drag reorder, rotate 90°, delete → save.
- Compress: Light (`/printer`), Recommended (`/ebook`), Strong (`/screen`) → show before/after size → download.

## Processing architecture

- `src/lib/pdf/` — pure TypeScript functions, no DOM:
  `mergePdfs`, `extractPages`, `splitEveryPage`, `organizePages`, `parsePageRanges`.
- `pdf-lib` operations run in a Web Worker so large files don't freeze the tab.
- Ghostscript runs in its own Web Worker, lazy-loaded only on the compress page.
  One module instance per worker is reused; input/output files are removed from the
  Emscripten FS after each job.
- Thumbnails rendered with `pdfjs-dist` using its own worker.

Verified: `@okathira/ghostpdl-wasm@1.1.0` supports `-sDEVICE=pdfwrite`, runs in Node
(usable in tests), and handles repeated `callMain` calls on one instance.
Also observed: `/ebook` can produce a larger file than the input, so that case must be handled.

## Error handling (fail fast, clear messages)

- Not a PDF: rejected on drop by checking the `%PDF-` magic bytes, not the extension.
- Encrypted PDF: "This PDF is password-protected. Remove the password and try again."
- Corrupt PDF: "We couldn't read this PDF." Original error logged to console.
- Invalid page range: specific message (e.g. "Page 9 doesn't exist — this PDF has 5 pages").
- Compressed output ≥ input: "This file is already well optimized." No larger file is offered.

## Privacy enforcement

- Strict Content-Security-Policy in `public/_headers` (`connect-src 'self'` plus the
  Cloudflare Web Analytics endpoint) so the browser itself blocks any upload.
- Cloudflare Web Analytics (cookieless, never sees files).

## Testing

- Vitest unit tests for `src/lib/pdf/*`, using PDFs generated in-test with `pdf-lib`
  (page count, order, rotation).
- `parsePageRanges` edge cases: `"1-3, 5"`, `"3-1"`, `"0"`, out-of-range, empty, stray commas.
- One small encrypted fixture PDF for the password error path.
- Ghostscript integration test: output is a valid PDF; `/screen` output smaller than a
  generated image-heavy input.
- React Testing Library tests for each tool island: drop zone, disabled states,
  reorder, error messages.
- Manual pre-launch check in the browser with wifi off.

## Launch

- Cloudflare Pages, `public/_headers` (CSP + long cache for `gs.wasm`).
- `@astrojs/sitemap`, `robots.txt`, OG image + `summary_large_image` card on every page, custom favicon.
- New git repo, public on personal GitHub, `LICENSE` = AGPL-3.0.
