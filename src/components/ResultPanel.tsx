import { downloadBytes } from '../lib/files';

interface ResultPanelProps {
  title: string;
  detail?: string;
  bytes: Uint8Array;
  fileName: string;
  type: 'application/pdf' | 'application/zip';
  resetLabel: string;
  onReset: () => void;
}

export function ResultPanel({ title, detail, bytes, fileName, type, resetLabel, onReset }: ResultPanelProps) {
  return (
    <section className="result" aria-live="polite">
      <h2 className="result__title">{title}</h2>
      {detail && <p className="result__detail">{detail}</p>}
      <div className="actions">
        <button type="button" className="button button--primary" onClick={() => downloadBytes(bytes, fileName, type)}>
          Download {fileName}
        </button>
        <button type="button" className="button" onClick={onReset}>
          {resetLabel}
        </button>
      </div>
    </section>
  );
}
