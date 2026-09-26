import { afterEach, describe, expect, it, vi } from 'vitest';
import { PdfToolError } from '../lib/pdf/errors';
import { createJobClient } from './client';
import { serveJobs } from './host';
import type { MessageEndpoint } from './protocol';

type TestJobs = {
  double: { input: { value: number }; output: number };
  bytes: { input: { size: number }; output: Uint8Array };
  failExpected: { input: Record<string, never>; output: never };
  failUnexpected: { input: Record<string, never>; output: never };
};

const ports: MessagePort[] = [];

function connectedClient() {
  const channel = new MessageChannel();
  ports.push(channel.port1, channel.port2);
  serveJobs<TestJobs>(channel.port2 as unknown as MessageEndpoint, {
    double: async ({ value }) => value * 2,
    bytes: async ({ size }) => new Uint8Array(size).fill(7),
    failExpected: async () => {
      throw new PdfToolError('encrypted', '"x.pdf" is password-protected.');
    },
    failUnexpected: async () => {
      throw new TypeError('boom');
    },
  });
  channel.port1.start();
  channel.port2.start();
  const createEndpoint = vi.fn(() => channel.port1 as unknown as MessageEndpoint);
  return { client: createJobClient<TestJobs>(createEndpoint), createEndpoint };
}

afterEach(() => {
  for (const port of ports.splice(0)) port.close();
});

describe('job client and host', () => {
  it('does not create the worker until the first job', async () => {
    const { client, createEndpoint } = connectedClient();
    expect(createEndpoint).not.toHaveBeenCalled();
    await client.run('double', { value: 1 });
    await client.run('double', { value: 2 });
    expect(createEndpoint).toHaveBeenCalledTimes(1);
  });

  it('creates the worker once when warmed, and reuses it for jobs', async () => {
    const { client, createEndpoint } = connectedClient();
    client.warm();
    client.warm();
    expect(createEndpoint).toHaveBeenCalledTimes(1);
    await client.run('double', { value: 1 });
    expect(createEndpoint).toHaveBeenCalledTimes(1);
  });

  it('resolves concurrent jobs with their own results', async () => {
    const { client } = connectedClient();
    const results = await Promise.all([1, 2, 3].map((value) => client.run('double', { value })));
    expect(results).toEqual([2, 4, 6]);
  });

  it('returns byte output intact', async () => {
    const { client } = connectedClient();
    const output = await client.run('bytes', { size: 4 });
    expect(Array.from(output)).toEqual([7, 7, 7, 7]);
  });

  it('rethrows expected failures as PdfToolError with code and message', async () => {
    const { client } = connectedClient();
    const error = await client.run('failExpected', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PdfToolError);
    expect(error).toMatchObject({ code: 'encrypted', message: '"x.pdf" is password-protected.' });
  });

  it('hides unexpected error details from the user and logs them in the worker', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = connectedClient();
    const error = await client.run('failUnexpected', {}).catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(PdfToolError);
    expect((error as Error).message).toBe('Something went wrong while processing the PDF.');
    expect(consoleError).toHaveBeenCalledWith('Job "failUnexpected" failed', expect.any(TypeError));
    consoleError.mockRestore();
  });
});
