/// <reference lib="webworker" />
import { loadPdf } from '../lib/pdf/load';
import { extractPages, mergePdfs, organizePages, splitEveryPage } from '../lib/pdf/operations';
import { zipFiles } from '../lib/zip';
import { serveJobs } from './host';
import type { PdfJobs } from './protocol';

serveJobs<PdfJobs>(self, {
  inspect: async ({ file }) => {
    const doc = await loadPdf(file.bytes, file.name);
    return { pageCount: doc.getPageCount() };
  },
  merge: ({ files }) => mergePdfs(files),
  extract: ({ file, indices }) => extractPages(file, indices),
  splitEvery: async ({ file }) => zipFiles(await splitEveryPage(file)),
  organize: ({ file, edits }) => organizePages(file, edits),
});
