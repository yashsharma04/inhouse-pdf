import { PdfToolError } from '../lib/pdf/errors';
import type { JobMap, JobRequest, JobResponse, MessageEndpoint } from './protocol';

export interface JobClient<Jobs extends JobMap> {
  /** Starts the worker now, so its script is fetched while the page is still online. */
  warm(): void;
  run<K extends keyof Jobs & string>(
    kind: K,
    input: Jobs[K]['input'],
    transfer?: Transferable[],
  ): Promise<Jobs[K]['output']>;
}

/**
 * Sends jobs to a worker and resolves with its output. Expected failures come back as
 * PdfToolError (user-facing message); anything else as a generic Error.
 * The endpoint is created on first use so pages don't spawn workers until needed.
 */
export function createJobClient<Jobs extends JobMap>(
  createEndpoint: () => MessageEndpoint,
): JobClient<Jobs> {
  let endpoint: MessageEndpoint | undefined;
  let nextId = 1;
  const pending = new Map<number, { resolve: (output: unknown) => void; reject: (error: Error) => void }>();

  function connect(): MessageEndpoint {
    if (endpoint) return endpoint;
    endpoint = createEndpoint();
    endpoint.addEventListener('message', (event: MessageEvent<JobResponse>) => {
      const response = event.data;
      const job = pending.get(response.id);
      if (!job) throw new Error(`Received a response for unknown job ${response.id}`);
      pending.delete(response.id);
      if (response.ok) {
        job.resolve(response.output);
      } else if (response.error.code) {
        job.reject(new PdfToolError(response.error.code, response.error.message));
      } else {
        job.reject(new Error(response.error.message));
      }
    });
    return endpoint;
  }

  return {
    warm() {
      connect();
    },
    run(kind, input, transfer = []) {
      const target = connect();
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve: resolve as (output: unknown) => void, reject });
        const request: JobRequest = { id, kind, input };
        target.postMessage(request, transfer);
      });
    },
  };
}
