# InhousePDF

Private PDF tools that run entirely in the browser: merge, split, organize, and compress.
Files never leave the device. A Quiet Labs project.

## Development

```sh
npm install
npm run dev        # http://localhost:4321
npm test           # unit + component tests
npm run check      # type check
npm run build      # static site in dist/
npm run preview    # serve dist/ (needed to test the CSP, which is not applied in dev)
```

## How it is built

- **Astro** renders static, SEO-friendly pages. Each tool is a React island (`src/components/tools`).
- **PDF logic** lives in `src/lib/pdf` (pdf-lib) and `src/lib/compress` (Ghostscript via
  `@okathira/ghostpdl-wasm`). It runs in Web Workers (`src/workers`) behind a small typed job protocol.
- **Thumbnails** use PDF.js. Its fonts, CMaps, and wasm decoders are copied to `public/pdfjs` by
  `scripts/copy-pdfjs-assets.mjs` before `dev` and `build`.
- **Privacy** is enforced by a Content-Security-Policy (`astro.config.mjs`, plus `public/_headers` for
  workers) that only allows connections to this origin and Cloudflare Web Analytics.
- Product name, domain, and links: `src/site.ts`. Tool page copy and FAQs: `src/tools.ts`.

## Scripts

- `node scripts/make-fixtures.mjs` regenerates `src/test/fixtures/encrypted.pdf`.
- `node scripts/make-og.mjs` regenerates the social preview image `public/og.png`.

## Deploying (Cloudflare Pages)

- Build command `npm run build`, output directory `dist`, Node 22.12+.
- `wrangler.jsonc` tells Cloudflare Workers to serve `404.html` for unknown URLs (`not_found_handling: 404-page`). Without this, missing routes return an empty 404.
- Enable Web Analytics in the project settings (it injects the cookieless beacon the CSP allows).
- Canonical URLs, sitemap, robots.txt, and OG tags come from `src/site.ts`.
  The site currently uses `https://inhouse-pdf.95yashsharma.workers.dev`. Change `site.url` if the host changes.

## License

AGPL-3.0-or-later, because it bundles Ghostscript. See [LICENSE](LICENSE).
