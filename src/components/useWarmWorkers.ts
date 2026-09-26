import { useEffect } from 'react';
import { compressJobs, pdfJobs } from '../workers';

/**
 * Fetches worker code (and, for compression, the Ghostscript engine) as soon as a tool
 * mounts, so the tool keeps working if the connection drops afterwards.
 */
export function useWarmWorkers({ compress = false }: { compress?: boolean } = {}) {
  useEffect(() => {
    pdfJobs.warm();
    if (compress) {
      compressJobs.run('warmUp', {}).catch((error: unknown) => {
        // Not fatal: the compress job loads the engine again and reports its own error.
        console.error('Preloading the compression engine failed', error);
      });
    }
  }, [compress]);
}
