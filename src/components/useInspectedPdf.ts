import { useCallback, useState } from 'react';
import { readPdfFile } from '../lib/files';
import { pdfJobs } from '../workers';
import { toUserMessage } from './errors';

export interface InspectedPdf {
  file: File;
  pageCount: number;
}

/** Validates a PDF in the worker and returns its page count. */
export async function inspectPdf(file: File): Promise<InspectedPdf> {
  const pdf = await readPdfFile(file);
  const { pageCount } = await pdfJobs.run('inspect', { file: pdf }, [pdf.bytes.buffer as ArrayBuffer]);
  return { file, pageCount };
}

/** Holds the single PDF a tool works on, validated as soon as it is chosen. */
export function useInspectedPdf() {
  const [pdf, setPdf] = useState<InspectedPdf | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const select = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      setPdf(await inspectPdf(file));
    } catch (e) {
      setPdf(null);
      setError(toUserMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setPdf(null);
    setError(null);
  }, []);

  return { pdf, error, loading, select, clear };
}
