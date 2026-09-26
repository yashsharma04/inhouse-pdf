// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

import { site } from './src/site.ts';

// https://astro.build/config
export default defineConfig({
  site: site.url,
  integrations: [react(), sitemap()],
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "connect-src 'self' https://cloudflareinsights.com",
        "img-src 'self' data: blob:",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
      ],
      scriptDirective: {
        resources: ["'self'", "'wasm-unsafe-eval'", 'https://static.cloudflareinsights.com'],
      },
    },
  },
  vite: {
    optimizeDeps: {
      exclude: ['@okathira/ghostpdl-wasm'],
    },
    worker: {
      format: 'es',
    },
  },
});
