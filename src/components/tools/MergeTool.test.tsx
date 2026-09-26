// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../workers', () => ({ pdfJobs: { run: vi.fn() }, compressJobs: { run: vi.fn() } }));
vi.mock('../../lib/files', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/files')>()),
  downloadBytes: vi.fn(),
}));

import { downloadBytes } from '../../lib/files';
import { PdfToolError } from '../../lib/pdf/errors';
import { button, fileInput, pdfFile, setupUser } from '../../test/tools';
import { pdfJobs } from '../../workers';
import { MergeTool } from './MergeTool';

const run = vi.mocked(pdfJobs.run);
const PAGE_COUNTS: Record<string, number> = { 'a.pdf': 2, 'b.pdf': 1, 'c.pdf': 5 };

beforeEach(() => {
  run.mockReset();
  vi.mocked(downloadBytes).mockReset();
  run.mockImplementation(async (kind, input) => {
    if (kind === 'inspect') {
      const { file } = input as { file: { name: string } };
      if (!(file.name in PAGE_COUNTS)) throw new PdfToolError('not-pdf', `"${file.name}" isn't a PDF file.`);
      return { pageCount: PAGE_COUNTS[file.name] };
    }
    if (kind === 'merge') return new Uint8Array(3000);
    throw new Error(`unexpected job ${kind}`);
  });
});

function fileNamesInOrder(): string[] {
  return screen.getAllByRole('listitem').map((item) => within(item).getByText(/\.pdf$/).textContent!);
}

describe('MergeTool', () => {
  it('starts with a drop zone and a disabled merge button', () => {
    render(<MergeTool />);
    expect(screen.getByText('Drop PDFs here or click to choose')).toBeInTheDocument();
    expect(button('Merge PDFs')).toBeDisabled();
  });

  it('lists added files with page counts and enables merging with two or more', async () => {
    const user = setupUser();
    render(<MergeTool />);
    await user.upload(fileInput(), [pdfFile('a.pdf'), pdfFile('b.pdf')]);

    expect(fileNamesInOrder()).toEqual(['a.pdf', 'b.pdf']);
    expect(screen.getByText('2 pages · 2.0 KB')).toBeInTheDocument();
    expect(screen.getByText('1 page · 2.0 KB')).toBeInTheDocument();
    expect(button('Merge PDFs')).toBeEnabled();
    expect(screen.getByText('Add more PDFs')).toBeInTheDocument();
  });

  it('asks for another file when only one is added', async () => {
    const user = setupUser();
    render(<MergeTool />);
    await user.upload(fileInput(), [pdfFile('a.pdf')]);
    expect(button('Merge PDFs')).toBeDisabled();
    expect(screen.getByText('Add at least one more PDF.')).toBeInTheDocument();
  });

  it('shows an error for invalid files but keeps the valid ones', async () => {
    const user = setupUser();
    render(<MergeTool />);
    await user.upload(fileInput(), [pdfFile('a.pdf'), new File(['hi'], 'notes.txt'), pdfFile('b.pdf')]);
    expect(screen.getByRole('alert')).toHaveTextContent('"notes.txt" isn\'t a PDF file.');
    expect(fileNamesInOrder()).toEqual(['a.pdf', 'b.pdf']);
  });

  it('reorders and removes files with the row buttons', async () => {
    const user = setupUser();
    render(<MergeTool />);
    await user.upload(fileInput(), [pdfFile('a.pdf'), pdfFile('b.pdf'), pdfFile('c.pdf')]);

    expect(button('Move a.pdf up')).toBeDisabled();
    expect(button('Move c.pdf down')).toBeDisabled();
    await user.click(button('Move a.pdf down'));
    expect(fileNamesInOrder()).toEqual(['b.pdf', 'a.pdf', 'c.pdf']);
    await user.click(button('Move c.pdf up'));
    expect(fileNamesInOrder()).toEqual(['b.pdf', 'c.pdf', 'a.pdf']);
    await user.click(button('Remove c.pdf'));
    expect(fileNamesInOrder()).toEqual(['b.pdf', 'a.pdf']);
  });

  it('merges files in the displayed order and offers the download', async () => {
    const user = setupUser();
    render(<MergeTool />);
    await user.upload(fileInput(), [pdfFile('a.pdf'), pdfFile('b.pdf')]);
    await user.click(button('Move b.pdf up'));
    await user.click(button('Merge PDFs'));

    const mergeCall = run.mock.calls.find(([kind]) => kind === 'merge')!;
    const { files } = mergeCall[1] as { files: { name: string }[] };
    expect(files.map((file) => file.name)).toEqual(['b.pdf', 'a.pdf']);

    expect(await screen.findByText('Your PDFs are merged')).toBeInTheDocument();
    expect(screen.getByText('2 files · 3 pages · 2.9 KB')).toBeInTheDocument();
    await user.click(button('Download merged.pdf'));
    expect(downloadBytes).toHaveBeenCalledWith(expect.any(Uint8Array), 'merged.pdf', 'application/pdf');
  });

  it('starts over from the result screen', async () => {
    const user = setupUser();
    render(<MergeTool />);
    await user.upload(fileInput(), [pdfFile('a.pdf'), pdfFile('b.pdf')]);
    await user.click(button('Merge PDFs'));
    await user.click(await screen.findByRole('button', { name: 'Merge different files' }));
    expect(screen.getByText('Drop PDFs here or click to choose')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('shows the message of an expected merge failure', async () => {
    run.mockImplementation(async (kind) => {
      if (kind === 'inspect') return { pageCount: 1 };
      throw new PdfToolError('corrupt', 'We couldn\'t read "b.pdf". The file may be damaged.');
    });
    const user = setupUser();
    render(<MergeTool />);
    await user.upload(fileInput(), [pdfFile('a.pdf'), pdfFile('b.pdf')]);
    await user.click(button('Merge PDFs'));
    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn\'t read "b.pdf".');
    expect(button('Merge PDFs')).toBeEnabled();
  });

  it('shows a generic message for unexpected failures', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    run.mockImplementation(async (kind) => {
      if (kind === 'inspect') return { pageCount: 1 };
      throw new RangeError('out of memory');
    });
    const user = setupUser();
    render(<MergeTool />);
    await user.upload(fileInput(), [pdfFile('a.pdf'), pdfFile('b.pdf')]);
    await user.click(button('Merge PDFs'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong while processing the PDF.');
    expect(consoleError).toHaveBeenCalledWith(expect.any(RangeError));
    consoleError.mockRestore();
  });
});
