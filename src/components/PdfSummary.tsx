import { formatBytes } from '../lib/files';
import type { InspectedPdf } from './useInspectedPdf';

export function pagesLabel(count: number): string {
  return `${count} ${count === 1 ? 'page' : 'pages'}`;
}

export function PdfSummary({ pdf, onChange }: { pdf: InspectedPdf; onChange: () => void }) {
  return (
    <div className="file-summary">
      <div>
        <p className="file-summary__name">{pdf.file.name}</p>
        <p className="file-summary__meta">
          {pagesLabel(pdf.pageCount)} · {formatBytes(pdf.file.size)}
        </p>
      </div>
      <button type="button" className="button button--quiet" onClick={onChange}>
        Choose another file
      </button>
    </div>
  );
}
