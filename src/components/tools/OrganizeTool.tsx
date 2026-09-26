import { useEffect, useState } from 'react';
import { readPdfFile } from '../../lib/files';
import { baseName, type PageEdit, type Rotation } from '../../lib/pdf/operations';
import { renderThumbnails } from '../../lib/thumbnails';
import { pdfJobs } from '../../workers';
import { DropZone } from '../DropZone';
import { ErrorMessage } from '../ErrorMessage';
import { PdfSummary, pagesLabel } from '../PdfSummary';
import { ResultPanel } from '../ResultPanel';
import { SortableList } from '../SortableList';
import { useAction } from '../useAction';
import { useInspectedPdf, type InspectedPdf } from '../useInspectedPdf';

interface PageItem extends PageEdit {
  id: string;
}

function initialPages(pageCount: number): PageItem[] {
  return Array.from({ length: pageCount }, (_, index) => ({ id: `page-${index}`, index, rotation: 0 }));
}

function useThumbnails(file: File): Record<number, string> {
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});

  useEffect(() => {
    const controller = new AbortController();
    const urls: string[] = [];
    void (async () => {
      const { bytes } = await readPdfFile(file);
      await renderThumbnails(
        bytes,
        (pageIndex, url) => {
          urls.push(url);
          setThumbnails((current) => ({ ...current, [pageIndex]: url }));
        },
        controller.signal,
      );
    })().catch((error: unknown) => {
      // Thumbnails are a preview only; the file already passed validation, so the tool stays usable.
      if (!controller.signal.aborted) console.error('Thumbnail rendering failed', error);
    });
    return () => {
      controller.abort();
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [file]);

  return thumbnails;
}

export function OrganizeTool() {
  const source = useInspectedPdf();

  if (!source.pdf) {
    return (
      <div className="tool">
        <DropZone
          title="Drop a PDF here or click to choose"
          hint="Reorder, rotate, and delete pages next."
          disabled={source.loading}
          onFiles={([file]) => void source.select(file!)}
        />
        <ErrorMessage message={source.error} />
      </div>
    );
  }

  return <OrganizeEditor pdf={source.pdf} onStartOver={source.clear} />;
}

function OrganizeEditor({ pdf, onStartOver }: { pdf: InspectedPdf; onStartOver: () => void }) {
  const [pages, setPages] = useState(() => initialPages(pdf.pageCount));
  const save = useAction<Uint8Array>();
  const thumbnails = useThumbnails(pdf.file);

  const updatePages = (next: PageItem[]) => {
    setPages(next);
    save.reset();
  };

  const rotate = (id: string) =>
    updatePages(
      pages.map((page) => (page.id === id ? { ...page, rotation: ((page.rotation + 90) % 360) as Rotation } : page)),
    );

  const runSave = () =>
    save.run(async () => {
      const file = await readPdfFile(pdf.file);
      const edits = pages.map(({ index, rotation }) => ({ index, rotation }));
      return pdfJobs.run('organize', { file, edits }, [file.bytes.buffer as ArrayBuffer]);
    });

  if (save.state.status === 'done') {
    return (
      <ResultPanel
        title="Your PDF is ready"
        detail={pagesLabel(pages.length)}
        bytes={save.state.result}
        fileName={`${baseName(pdf.file.name)}-organized.pdf`}
        type="application/pdf"
        resetLabel="Organize another PDF"
        onReset={onStartOver}
      />
    );
  }

  const changed = pages.length !== pdf.pageCount || pages.some((page, i) => page.index !== i || page.rotation !== 0);

  return (
    <div className="tool">
      <PdfSummary pdf={pdf} onChange={onStartOver} />
      <p className="tool__hint">Drag pages by their handle to reorder them.</p>

      <SortableList
        items={pages}
        layout="grid"
        onReorder={updatePages}
        itemLabel={(page) => `page ${page.index + 1}`}
        renderItem={(page, _position, handle) => (
          <figure className="page-card">
            <div className="page-card__preview">
              {thumbnails[page.index] ? (
                <img
                  src={thumbnails[page.index]}
                  alt={`Page ${page.index + 1}`}
                  style={{ transform: `rotate(${page.rotation}deg)` }}
                />
              ) : (
                <span className="page-card__placeholder">Loading…</span>
              )}
            </div>
            <figcaption className="page-card__footer">
              {handle}
              <span className="page-card__label">{page.index + 1}</span>
              <button
                type="button"
                className="icon-button"
                aria-label={`Rotate page ${page.index + 1}`}
                onClick={() => rotate(page.id)}
              >
                ↻
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Delete page ${page.index + 1}`}
                onClick={() => updatePages(pages.filter((other) => other.id !== page.id))}
              >
                ✕
              </button>
            </figcaption>
          </figure>
        )}
      />

      {pages.length === 0 && <ErrorMessage message="Keep at least one page." />}
      <ErrorMessage message={save.state.status === 'error' ? save.state.message : null} />

      <div className="actions">
        <button
          type="button"
          className="button button--primary"
          disabled={pages.length === 0 || save.state.status === 'working'}
          onClick={runSave}
        >
          {save.state.status === 'working' ? 'Saving…' : 'Save PDF'}
        </button>
        <button type="button" className="button" disabled={!changed} onClick={() => updatePages(initialPages(pdf.pageCount))}>
          Reset changes
        </button>
        <span className="actions__hint">
          {pages.length} of {pagesLabel(pdf.pageCount)} kept
        </span>
      </div>
    </div>
  );
}
