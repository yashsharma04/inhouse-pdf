import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

const THUMBNAIL_WIDTH = 240;

/**
 * Renders a thumbnail for every page, one at a time, calling `onThumbnail` with a blob URL
 * as each one finishes. Stops early when `signal` is aborted. The caller owns the URLs.
 */
export async function renderThumbnails(
  bytes: Uint8Array,
  onThumbnail: (pageIndex: number, url: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const task = getDocument({
    data: bytes,
    cMapUrl: '/pdfjs/cmaps/',
    standardFontDataUrl: '/pdfjs/standard_fonts/',
    wasmUrl: '/pdfjs/wasm/',
  });
  signal.addEventListener('abort', () => void task.destroy(), { once: true });

  const doc = await task.promise;
  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      if (signal.aborted) return;
      const page = await doc.getPage(pageNumber);
      const unscaled = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: THUMBNAIL_WIDTH / unscaled.width });

      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      page.cleanup();

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('toBlob failed'))), 'image/png'),
      );
      if (signal.aborted) return;
      onThumbnail(pageNumber - 1, URL.createObjectURL(blob));
    }
  } finally {
    await task.destroy();
  }
}
