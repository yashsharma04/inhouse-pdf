import { useState } from 'react';
import type { CompressionLevel, CompressResult } from '../../lib/compress/ghostscript';
import { formatBytes, readPdfFile } from '../../lib/files';
import { baseName } from '../../lib/pdf/names';
import { compressJobs } from '../../workers';
import { DropZone } from '../DropZone';
import { ErrorMessage } from '../ErrorMessage';
import { PdfSummary } from '../PdfSummary';
import { ResultPanel } from '../ResultPanel';
import { useAction } from '../useAction';
import { useInspectedPdf } from '../useInspectedPdf';
import { useWarmWorkers } from '../useWarmWorkers';

const LEVELS: { value: CompressionLevel; title: string; hint: string }[] = [
  { value: 'light', title: 'Light', hint: 'High quality, good for printing. Smallest size savings.' },
  { value: 'recommended', title: 'Recommended', hint: 'Good quality for reading on screen. Usually a big saving.' },
  { value: 'strong', title: 'Strong', hint: 'Smallest file. Images become noticeably softer.' },
];

export function CompressTool() {
  useWarmWorkers({ compress: true });
  const source = useInspectedPdf();
  const [level, setLevel] = useState<CompressionLevel>('recommended');
  const compress = useAction<CompressResult>();
  const pdf = source.pdf;

  const runCompress = () =>
    compress.run(async () => {
      const file = await readPdfFile(pdf!.file);
      return compressJobs.run('compress', { file, level }, [file.bytes.buffer as ArrayBuffer]);
    });

  const startOver = () => {
    compress.reset();
    source.clear();
  };

  if (compress.state.status === 'done') {
    const { bytes, originalSize, compressedSize } = compress.state.result;
    const saved = Math.round((1 - compressedSize / originalSize) * 100);
    return (
      <ResultPanel
        title={`${saved}% smaller`}
        detail={`${formatBytes(originalSize)} → ${formatBytes(compressedSize)}`}
        bytes={bytes}
        fileName={`${baseName(pdf!.file.name)}-compressed.pdf`}
        type="application/pdf"
        resetLabel="Compress another PDF"
        onReset={startOver}
      />
    );
  }

  if (!pdf) {
    return (
      <div className="tool">
        <DropZone
          title="Drop a PDF here or click to choose"
          hint="Choose how much to compress next."
          disabled={source.loading}
          onFiles={([file]) => void source.select(file!)}
        />
        <ErrorMessage message={source.error} />
      </div>
    );
  }

  const working = compress.state.status === 'working';

  return (
    <div className="tool">
      <PdfSummary pdf={pdf} onChange={startOver} />

      <fieldset className="options" disabled={working}>
        <legend className="options__legend">Compression level</legend>
        {LEVELS.map((option) => (
          <label key={option.value} className="option">
            <input
              type="radio"
              name="compression-level"
              checked={level === option.value}
              onChange={() => {
                setLevel(option.value);
                compress.reset();
              }}
            />
            <span>
              <strong>{option.title}</strong>
              <span className="option__hint">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <ErrorMessage message={compress.state.status === 'error' ? compress.state.message : null} />

      <div className="actions">
        <button type="button" className="button button--primary" disabled={working} onClick={runCompress}>
          {working ? 'Compressing…' : 'Compress PDF'}
        </button>
        {working && (
          <span className="actions__hint">
            The first run also loads the compression engine. Large files can take a minute.
          </span>
        )}
      </div>
    </div>
  );
}
