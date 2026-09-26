// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
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
import { SplitTool } from './SplitTool';

const run = vi.mocked(pdfJobs.run);

beforeEach(() => {
  run.mockReset();
  vi.mocked(downloadBytes).mockReset();
  run.mockImplementation(async (kind) => {
    if (kind === 'inspect') return { pageCount: 5 };
    return new Uint8Array(10);
  });
});

async function renderWithFile() {
  const user = setupUser();
  render(<SplitTool />);
  await user.upload(fileInput(), pdfFile('Report.pdf'));
  await screen.findByText('Report.pdf');
  return user;
}

describe('SplitTool', () => {
  it('shows the chosen file with its page count and size', async () => {
    await renderWithFile();
    expect(screen.getByText('5 pages · 2.0 KB')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Extract pages/ })).toBeChecked();
  });

  it('shows the validation error when the file is rejected', async () => {
    run.mockRejectedValueOnce(
      new PdfToolError('encrypted', '"locked.pdf" is password-protected. Remove the password and try again.'),
    );
    const user = setupUser();
    render(<SplitTool />);
    await user.upload(fileInput(), pdfFile('locked.pdf'));
    expect(await screen.findByRole('alert')).toHaveTextContent('"locked.pdf" is password-protected.');
    expect(screen.getByText('Drop a PDF here or click to choose')).toBeInTheDocument();
  });

  it('keeps the button disabled until the ranges are valid, with live feedback', async () => {
    const user = await renderWithFile();
    const input = screen.getByLabelText('Pages to extract');
    expect(button('Split PDF')).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.type(input, '7');
    expect(screen.getByRole('alert')).toHaveTextContent("Page 7 doesn't exist. This PDF has 5 pages.");
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(button('Split PDF')).toBeDisabled();

    await user.clear(input);
    await user.type(input, '1-2, 4');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(button('Split PDF')).toBeEnabled();
  });

  it('extracts the chosen pages into one PDF', async () => {
    const user = await renderWithFile();
    await user.type(screen.getByLabelText('Pages to extract'), '4, 1-2');
    await user.click(button('Split PDF'));

    expect(run).toHaveBeenCalledWith(
      'extract',
      { file: expect.objectContaining({ name: 'Report.pdf' }), indices: [3, 0, 1] },
      expect.any(Array),
    );
    expect(await screen.findByText('Your PDF is split')).toBeInTheDocument();
    expect(screen.getByText('3 pages')).toBeInTheDocument();
    await user.click(button('Download Report-pages.pdf'));
    expect(downloadBytes).toHaveBeenCalledWith(expect.any(Uint8Array), 'Report-pages.pdf', 'application/pdf');
  });

  it('splits every page into a zip', async () => {
    const user = await renderWithFile();
    await user.click(screen.getByRole('radio', { name: /Split every page/ }));
    expect(screen.queryByLabelText('Pages to extract')).not.toBeInTheDocument();
    await user.click(button('Split PDF'));

    expect(run).toHaveBeenCalledWith('splitEvery', expect.anything(), expect.any(Array));
    expect(await screen.findByText('5 pages, one PDF each')).toBeInTheDocument();
    await user.click(button('Download Report-pages.zip'));
    expect(downloadBytes).toHaveBeenCalledWith(expect.any(Uint8Array), 'Report-pages.zip', 'application/zip');
  });

  it('returns to the drop zone when choosing another file', async () => {
    const user = await renderWithFile();
    await user.click(button('Choose another file'));
    expect(screen.getByText('Drop a PDF here or click to choose')).toBeInTheDocument();
  });

  it('starts over from the result screen with empty ranges', async () => {
    const user = await renderWithFile();
    await user.type(screen.getByLabelText('Pages to extract'), '1');
    await user.click(button('Split PDF'));
    await user.click(await screen.findByRole('button', { name: 'Split another PDF' }));
    await user.upload(fileInput(), pdfFile('Other.pdf'));
    expect(await screen.findByLabelText('Pages to extract')).toHaveValue('');
  });
});
