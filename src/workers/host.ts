import { PdfToolError } from '../lib/pdf/errors';
import type { JobMap, JobRequest, JobResponse, MessageEndpoint } from './protocol';

export type JobHandlers<Jobs extends JobMap> = {
  [K in keyof Jobs]: (input: Jobs[K]['input']) => Promise<Jobs[K]['output']>;
};

function transferablesOf(output: unknown): Transferable[] {
  if (output instanceof Uint8Array) return [output.buffer as ArrayBuffer];
  if (output && typeof output === 'object' && 'bytes' in output && output.bytes instanceof Uint8Array) {
    return [output.bytes.buffer as ArrayBuffer];
  }
  return [];
}

/** Runs inside a worker: executes incoming jobs and posts back results or errors. */
export function serveJobs<Jobs extends JobMap>(
  endpoint: MessageEndpoint,
  handlers: JobHandlers<Jobs>,
): void {
  endpoint.addEventListener('message', async (event: MessageEvent<JobRequest>) => {
    const { id, kind, input } = event.data;
    let response: JobResponse;
    try {
      const handler = handlers[kind as keyof Jobs];
      if (!handler) throw new Error(`Unknown job kind: ${kind}`);
      const output = await handler(input as Jobs[keyof Jobs]['input']);
      response = { id, ok: true, output };
      endpoint.postMessage(response, transferablesOf(output));
      return;
    } catch (error) {
      if (error instanceof PdfToolError) {
        response = { id, ok: false, error: { code: error.code, message: error.message } };
      } else {
        console.error(`Job "${kind}" failed`, error);
        response = { id, ok: false, error: { message: 'Something went wrong while processing the PDF.' } };
      }
    }
    endpoint.postMessage(response);
  });
}
