import { describe, expect, it } from 'vitest';
import { formatBytes } from './files';

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [900, '900 B'],
    [1024, '1.0 KB'],
    [1536, '1.5 KB'],
    [20 * 1024, '20 KB'],
    [5.25 * 1024 * 1024, '5.3 MB'],
    [3 * 1024 ** 3, '3.0 GB'],
  ])('formats %i as %s', (size, expected) => {
    expect(formatBytes(size)).toBe(expected);
  });
});
