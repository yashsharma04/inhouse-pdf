import { PdfToolError } from './errors';

const TOKEN = /^(\d+)(?:\s*-\s*(\d+))?$/;

function invalidRange(message: string): PdfToolError {
  return new PdfToolError('invalid-range', message);
}

/**
 * Parses user input like "1-3, 5" into zero-based page indices, in the order typed.
 * Throws PdfToolError('invalid-range') with a user-facing message on bad input.
 */
export function parsePageRanges(input: string, pageCount: number): number[] {
  const tokens = input
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    throw invalidRange('Enter the pages you want, for example 1-3, 5.');
  }

  const pageLabel = pageCount === 1 ? 'page' : 'pages';
  const indices: number[] = [];

  for (const token of tokens) {
    const match = TOKEN.exec(token);
    if (!match) {
      throw invalidRange(`"${token}" isn't a page number or range.`);
    }
    const start = Number(match[1]);
    const end = match[2] === undefined ? start : Number(match[2]);

    if (start < 1 || end < 1) {
      throw invalidRange('Page numbers start at 1.');
    }
    if (start > end) {
      throw invalidRange(`The range "${token}" is backwards. Did you mean ${end}-${start}?`);
    }
    if (end > pageCount) {
      throw invalidRange(`Page ${end} doesn't exist. This PDF has ${pageCount} ${pageLabel}.`);
    }

    for (let page = start; page <= end; page++) {
      indices.push(page - 1);
    }
  }

  return indices;
}
