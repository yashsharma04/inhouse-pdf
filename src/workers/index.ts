import { createJobClient } from './client';
import type { CompressJobs, PdfJobs } from './protocol';

export const pdfJobs = createJobClient<PdfJobs>(
  () => new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' }),
);

export const compressJobs = createJobClient<CompressJobs>(
  () => new Worker(new URL('./compress.worker.ts', import.meta.url), { type: 'module' }),
);
