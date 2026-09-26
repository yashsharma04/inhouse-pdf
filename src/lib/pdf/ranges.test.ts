import { describe, expect, it } from 'vitest';
import { PdfToolError } from './errors';
import { parsePageRanges } from './ranges';

describe('parsePageRanges', () => {
  it('parses single pages and ranges into zero-based indices in the given order', () => {
    expect(parsePageRanges('1-3, 5', 10)).toEqual([0, 1, 2, 4]);
    expect(parsePageRanges('5, 1-2', 10)).toEqual([4, 0, 1]);
  });

  it('tolerates whitespace and stray commas', () => {
    expect(parsePageRanges('  2 ,, 4 - 5 , ', 10)).toEqual([1, 3, 4]);
  });

  it('accepts a single-page range like 3-3', () => {
    expect(parsePageRanges('3-3', 5)).toEqual([2]);
  });

  it('keeps duplicates so the user gets exactly what they typed', () => {
    expect(parsePageRanges('1, 1', 3)).toEqual([0, 0]);
  });

  it.each([
    ['', 'Enter the pages you want, for example 1-3, 5.'],
    [' , ', 'Enter the pages you want, for example 1-3, 5.'],
    ['abc', '"abc" isn\'t a page number or range.'],
    ['1-', '"1-" isn\'t a page number or range.'],
    ['1-2-3', '"1-2-3" isn\'t a page number or range.'],
    ['2.5', '"2.5" isn\'t a page number or range.'],
    ['0', 'Page numbers start at 1.'],
    ['0-2', 'Page numbers start at 1.'],
    ['9', "Page 9 doesn't exist. This PDF has 5 pages."],
    ['4-9', "Page 9 doesn't exist. This PDF has 5 pages."],
    ['3-1', 'The range "3-1" is backwards. Did you mean 1-3?'],
  ])('rejects %j with a clear message', (input, message) => {
    const run = () => parsePageRanges(input, 5);
    expect(run).toThrow(PdfToolError);
    expect(run).toThrow(message);
  });

  it('uses singular "page" for one-page PDFs', () => {
    expect(() => parsePageRanges('2', 1)).toThrow("Page 2 doesn't exist. This PDF has 1 page.");
  });
});
