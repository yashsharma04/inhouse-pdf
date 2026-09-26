import { useState } from 'react';
import { readPdfFile } from '../../lib/files';
import { PdfToolError } from '../../lib/pdf/errors';
import { baseName } from '../../lib/pdf/operations';
import { parsePageRanges } from '../../lib/pdf/ranges';
import { pdfJobs } from '../../workers';
import { DropZone } from '../DropZone';
import { ErrorMessage } from '../ErrorMessage';
import { PdfSummary, pagesLabel } from '../PdfSummary';
import { ResultPanel } from '../ResultPanel';
import { useAction } from '../useAction';
import { useInspectedPdf } from '../useInspectedPdf';

type Mode = 'ranges' | 'every';

interface SplitResult {
  bytes: Uint8Array;
  fileName: string;
  type: 'application/pdf' | 'application/zip';
  detail: string;
}

function validateRanges(input: string, pageCount: number): { indices: number[] } | { error: string } {
  try {
    return { indices: parsePageRanges(input, pageCount) };
  } catch (error) {
    if (error instanceof PdfToolError) return { error: error.message };
    throw error;
  }
}

export function SplitTool() {
  const source = useInspectedPdf();
  const [mode, setMode] = useState<Mode>('ranges');
  const [ranges, setRanges] = useState('');
  const split = useAction<SplitResult>();

  const pdf = source.pdf;
  const validation = pdf && mode === 'ranges' ? validateRanges(ranges, pdf.pageCount) : null;
  const showRangeError = validation && 'error' in validation && ranges.trim() !== '';
  const canSplit =
    pdf !== null && split.state.status !== 'working' && (mode === 'every' || (validation !== null && 'indices' in validation));

  const runSplit = () =>
    split.run(async () => {
      const file = await readPdfFile(pdf!.file);
      const transfer = [file.bytes.buffer as ArrayBuffer];
      const base = baseName(file.name);
      if (mode === 'every') {
        const bytes = await pdfJobs.run('splitEvery', { file }, transfer);
        return { bytes, fileName: `${base}-pages.zip`, type: 'application/zip', detail: `${pagesLabel(pdf!.pageCount)}, one PDF each` };
      }
      const indices = (validation as { indices: number[] }).indices;
      const bytes = await pdfJobs.run('extract', { file, indices }, transfer);
      return { bytes, fileName: `${base}-pages.pdf`, type: 'application/pdf', detail: pagesLabel(indices.length) };
    });

  const startOver = () => {
    split.reset();
    source.clear();
    setRanges('');
  };

  if (split.state.status === 'done') {
    const { bytes, fileName, type, detail } = split.state.result;
    return (
      <ResultPanel
        title="Your PDF is split"
        detail={detail}
        bytes={bytes}
        fileName={fileName}
        type={type}
        resetLabel="Split another PDF"
        onReset={startOver}
      />
    );
  }

  if (!pdf) {
    return (
      <div className="tool">
        <DropZone
          title="Drop a PDF here or click to choose"
          hint="Pick the pages to keep next."
          disabled={source.loading}
          onFiles={([file]) => void source.select(file!)}
        />
        <ErrorMessage message={source.error} />
      </div>
    );
  }

  return (
    <div className="tool">
      <PdfSummary pdf={pdf} onChange={startOver} />

      <fieldset className="options">
        <legend className="options__legend">How do you want to split it?</legend>
        <label className="option">
          <input type="radio" name="split-mode" checked={mode === 'ranges'} onChange={() => setMode('ranges')} />
          <span>
            <strong>Extract pages</strong>
            <span className="option__hint">Choose pages and get them as one PDF.</span>
          </span>
        </label>
        <label className="option">
          <input type="radio" name="split-mode" checked={mode === 'every'} onChange={() => setMode('every')} />
          <span>
            <strong>Split every page</strong>
            <span className="option__hint">Get each page as its own PDF, in a zip file.</span>
          </span>
        </label>
      </fieldset>

      {mode === 'ranges' && (
        <label className="field">
          <span className="field__label">Pages to extract</span>
          <input
            className="field__input"
            type="text"
            inputMode="numeric"
            placeholder={`e.g. 1-3, 5 (this PDF has ${pagesLabel(pdf.pageCount)})`}
            value={ranges}
            onChange={(event) => setRanges(event.target.value)}
            aria-invalid={showRangeError ? true : undefined}
          />
        </label>
      )}
      {showRangeError && <ErrorMessage message={(validation as { error: string }).error} />}

      <ErrorMessage message={split.state.status === 'error' ? split.state.message : null} />

      <div className="actions">
        <button type="button" className="button button--primary" disabled={!canSplit} onClick={runSplit}>
          {split.state.status === 'working' ? 'Splitting…' : 'Split PDF'}
        </button>
      </div>
    </div>
  );
}
