// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../workers', () => ({
  pdfJobs: { run: vi.fn(), warm: vi.fn() },
  compressJobs: { run: vi.fn(), warm: vi.fn() },
}));
vi.mock('../../lib/files', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/files')>()),
  downloadBytes: vi.fn(),
}));

import { downloadBytes } from '../../lib/files';
import { PdfToolError } from '../../lib/pdf/errors';
import { button, fileInput, pdfFile, setupUser } from '../../test/tools';
import { compressJobs, pdfJobs } from '../../workers';
import { CompressTool } from './CompressTool';

const run = vi.mocked(compressJobs.run);
const RESULT = { bytes: new Uint8Array(10), originalSize: 4 * 1024 * 1024, compressedSize: 1024 * 1024 };

/** Sets what the compress job does; the warm-up job always succeeds. */
function onCompress(behavior: () => Promise<unknown>) {
  run.mockImplementation(async (kind) => (kind === 'warmUp' ? null : behavior()) as never);
}

beforeEach(() => {
  vi.mocked(pdfJobs.run).mockReset().mockResolvedValue({ pageCount: 4 });
  vi.mocked(pdfJobs.warm).mockReset();
  vi.mocked(downloadBytes).mockReset();
  run.mockReset();
  onCompress(async () => RESULT);
});

async function renderWithFile() {
  const user = setupUser();
  render(<CompressTool />);
  await user.upload(fileInput(), pdfFile('scan.pdf'));
  await screen.findByText('scan.pdf');
  return user;
}

describe('CompressTool', () => {
  it('preloads the workers and compression engine on mount', () => {
    render(<CompressTool />);
    expect(pdfJobs.warm).toHaveBeenCalled();
    expect(run).toHaveBeenCalledWith('warmUp', {});
  });

  it('defaults to the recommended level', async () => {
    await renderWithFile();
    expect(screen.getByRole('radio', { name: /Recommended/ })).toBeChecked();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('compresses with the chosen level and shows the saving', async () => {
    const user = await renderWithFile();
    await user.click(screen.getByRole('radio', { name: /Strong/ }));
    await user.click(button('Compress PDF'));

    expect(run).toHaveBeenCalledWith(
      'compress',
      { file: expect.objectContaining({ name: 'scan.pdf' }), level: 'strong' },
      expect.any(Array),
    );
    expect(await screen.findByText('75% smaller')).toBeInTheDocument();
    expect(screen.getByText('4.0 MB → 1.0 MB')).toBeInTheDocument();
    await user.click(button('Download scan-compressed.pdf'));
    expect(downloadBytes).toHaveBeenCalledWith(expect.any(Uint8Array), 'scan-compressed.pdf', 'application/pdf');
  });

  it('explains the wait while compressing', async () => {
    onCompress(() => new Promise(() => {}));
    const user = await renderWithFile();
    await user.click(button('Compress PDF'));
    expect(button('Compressing…')).toBeDisabled();
    expect(screen.getByText(/The first run also loads the compression engine/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Light/ })).toBeDisabled();
  });

  it('tells the user when the file is already optimized', async () => {
    onCompress(async () => {
      throw new PdfToolError('already-optimized', '"scan.pdf" is already well optimized. Compressing it wouldn\'t make it smaller.');
    });
    const user = await renderWithFile();
    await user.click(button('Compress PDF'));
    expect(await screen.findByRole('alert')).toHaveTextContent('"scan.pdf" is already well optimized.');
  });

  it('clears a previous error when another level is picked', async () => {
    onCompress(async () => {
      throw new PdfToolError('already-optimized', 'already optimized');
    });
    const user = await renderWithFile();
    await user.click(button('Compress PDF'));
    await screen.findByRole('alert');
    await user.click(screen.getByRole('radio', { name: /Strong/ }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('starts over from the result screen', async () => {
    const user = await renderWithFile();
    await user.click(button('Compress PDF'));
    await user.click(await screen.findByRole('button', { name: 'Compress another PDF' }));
    expect(screen.getByText('Drop a PDF here or click to choose')).toBeInTheDocument();
  });
});
