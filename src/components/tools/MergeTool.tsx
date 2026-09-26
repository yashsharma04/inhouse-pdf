import { useState } from 'react';
import { formatBytes, readPdfFile } from '../../lib/files';
import { pdfJobs } from '../../workers';
import { DropZone } from '../DropZone';
import { ErrorMessage } from '../ErrorMessage';
import { pagesLabel } from '../PdfSummary';
import { ResultPanel } from '../ResultPanel';
import { SortableList } from '../SortableList';
import { toUserMessage } from '../errors';
import { useAction } from '../useAction';
import { inspectPdf, type InspectedPdf } from '../useInspectedPdf';
import { useWarmWorkers } from '../useWarmWorkers';

interface MergeItem extends InspectedPdf {
  id: string;
}

let nextId = 0;

export function MergeTool() {
  useWarmWorkers();
  const [items, setItems] = useState<MergeItem[]>([]);
  const [addErrors, setAddErrors] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const merge = useAction<Uint8Array>();

  const updateItems = (next: MergeItem[]) => {
    setItems(next);
    merge.reset();
  };

  const addFiles = async (files: File[]) => {
    setAdding(true);
    const added: MergeItem[] = [];
    const errors: string[] = [];
    for (const file of files) {
      try {
        added.push({ id: `file-${nextId++}`, ...(await inspectPdf(file)) });
      } catch (error) {
        errors.push(toUserMessage(error));
      }
    }
    setAddErrors(errors);
    updateItems([...items, ...added]);
    setAdding(false);
  };

  const move = (index: number, offset: -1 | 1) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + offset, 0, item!);
    updateItems(next);
  };

  const runMerge = () =>
    merge.run(async () => {
      const files = await Promise.all(items.map((item) => readPdfFile(item.file)));
      return pdfJobs.run(
        'merge',
        { files },
        files.map((file) => file.bytes.buffer as ArrayBuffer),
      );
    });

  const totalPages = items.reduce((sum, item) => sum + item.pageCount, 0);

  if (merge.state.status === 'done') {
    return (
      <ResultPanel
        title="Your PDFs are merged"
        detail={`${items.length} files · ${pagesLabel(totalPages)} · ${formatBytes(merge.state.result.length)}`}
        bytes={merge.state.result}
        fileName="merged.pdf"
        type="application/pdf"
        resetLabel="Merge different files"
        onReset={() => updateItems([])}
      />
    );
  }

  return (
    <div className="tool">
      <DropZone
        title={items.length === 0 ? 'Drop PDFs here or click to choose' : 'Add more PDFs'}
        hint="Select two or more files. You can reorder them next."
        multiple
        disabled={adding || merge.state.status === 'working'}
        onFiles={addFiles}
      />
      {addErrors.map((message) => (
        <ErrorMessage key={message} message={message} />
      ))}

      {items.length > 0 && (
        <SortableList
          items={items}
          layout="list"
          onReorder={updateItems}
          itemLabel={(item) => item.file.name}
          renderItem={(item, index, handle) => (
            <div className="file-row">
              {handle}
              <div className="file-row__info">
                <p className="file-row__name">{item.file.name}</p>
                <p className="file-row__meta">
                  {pagesLabel(item.pageCount)} · {formatBytes(item.file.size)}
                </p>
              </div>
              <div className="file-row__actions">
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Move ${item.file.name} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Move ${item.file.name} down`}
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove ${item.file.name}`}
                  onClick={() => updateItems(items.filter((other) => other.id !== item.id))}
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        />
      )}

      <ErrorMessage message={merge.state.status === 'error' ? merge.state.message : null} />

      <div className="actions">
        <button
          type="button"
          className="button button--primary"
          disabled={items.length < 2 || merge.state.status === 'working'}
          onClick={runMerge}
        >
          {merge.state.status === 'working' ? 'Merging…' : 'Merge PDFs'}
        </button>
        {items.length === 1 && <span className="actions__hint">Add at least one more PDF.</span>}
      </div>
    </div>
  );
}
