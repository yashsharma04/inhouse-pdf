// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../workers', () => ({ pdfJobs: { run: vi.fn() }, compressJobs: { run: vi.fn() } }));
vi.mock('../../lib/thumbnails', () => ({ renderThumbnails: vi.fn() }));
vi.mock('../../lib/files', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/files')>()),
  downloadBytes: vi.fn(),
}));

import { downloadBytes } from '../../lib/files';
import { renderThumbnails } from '../../lib/thumbnails';
import { button, fileInput, pdfFile, setupUser } from '../../test/tools';
import { pdfJobs } from '../../workers';
import { OrganizeTool } from './OrganizeTool';

const run = vi.mocked(pdfJobs.run);

beforeEach(() => {
  run.mockReset();
  vi.mocked(downloadBytes).mockReset();
  run.mockImplementation(async (kind) => {
    if (kind === 'inspect') return { pageCount: 3 };
    return new Uint8Array(10);
  });
  // Only the first page gets a thumbnail, so both states are visible.
  vi.mocked(renderThumbnails).mockImplementation(async (_bytes, onThumbnail) => {
    onThumbnail(0, 'blob:thumb-0');
  });
});

async function renderWithFile() {
  const user = setupUser();
  render(<OrganizeTool />);
  await user.upload(fileInput(), pdfFile('deck.pdf'));
  await screen.findByText('deck.pdf');
  return user;
}

function pageLabels(): string[] {
  return screen.getAllByRole('listitem').map((item) => item.querySelector('.page-card__label')!.textContent!);
}

describe('OrganizeTool', () => {
  it('shows a card per page with thumbnails as they render', async () => {
    await renderWithFile();
    expect(pageLabels()).toEqual(['1', '2', '3']);
    expect(await screen.findByAltText('Page 1')).toHaveAttribute('src', 'blob:thumb-0');
    expect(screen.getAllByText('Loading…')).toHaveLength(2);
    expect(screen.getByText('3 of 3 pages kept')).toBeInTheDocument();
  });

  it('rotates a page preview in 90° steps', async () => {
    const user = await renderWithFile();
    const thumbnail = await screen.findByAltText('Page 1');
    await user.click(button('Rotate page 1'));
    expect(thumbnail).toHaveStyle({ transform: 'rotate(90deg)' });
    for (let i = 0; i < 3; i++) await user.click(button('Rotate page 1'));
    expect(thumbnail).toHaveStyle({ transform: 'rotate(0deg)' });
  });

  it('saves the kept pages in order with their added rotation', async () => {
    const user = await renderWithFile();
    await user.click(button('Delete page 2'));
    await user.click(button('Rotate page 3'));
    expect(pageLabels()).toEqual(['1', '3']);
    expect(screen.getByText('2 of 3 pages kept')).toBeInTheDocument();

    await user.click(button('Save PDF'));
    expect(run).toHaveBeenCalledWith(
      'organize',
      {
        file: expect.objectContaining({ name: 'deck.pdf' }),
        edits: [
          { index: 0, rotation: 0 },
          { index: 2, rotation: 90 },
        ],
      },
      expect.any(Array),
    );
    expect(await screen.findByText('Your PDF is ready')).toBeInTheDocument();
    await user.click(button('Download deck-organized.pdf'));
    expect(downloadBytes).toHaveBeenCalledWith(expect.any(Uint8Array), 'deck-organized.pdf', 'application/pdf');
  });

  it('blocks saving when every page is deleted', async () => {
    const user = await renderWithFile();
    for (const page of [1, 2, 3]) await user.click(button(`Delete page ${page}`));
    expect(screen.getByRole('alert')).toHaveTextContent('Keep at least one page.');
    expect(button('Save PDF')).toBeDisabled();
  });

  it('resets all changes', async () => {
    const user = await renderWithFile();
    expect(button('Reset changes')).toBeDisabled();
    await user.click(button('Delete page 1'));
    await user.click(button('Reset changes'));
    expect(pageLabels()).toEqual(['1', '2', '3']);
    expect(button('Reset changes')).toBeDisabled();
  });

  it('keeps working when thumbnails fail to render', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(renderThumbnails).mockRejectedValueOnce(new Error('render failed'));
    const user = await renderWithFile();
    await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith('Thumbnail rendering failed', expect.any(Error)));
    await user.click(button('Save PDF'));
    expect(await screen.findByText('Your PDF is ready')).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
