import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

export function pdfFile(name: string, size = 2048): File {
  return new File([new Uint8Array(size).fill(0x25)], name, { type: 'application/pdf' });
}

/** accept filtering is disabled so tests can drop non-PDF files and check validation. */
export function setupUser() {
  return userEvent.setup({ applyAccept: false });
}

export function fileInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('No file input rendered');
  return input;
}

export function button(name: string | RegExp): HTMLButtonElement {
  return screen.getByRole('button', { name }) as HTMLButtonElement;
}
