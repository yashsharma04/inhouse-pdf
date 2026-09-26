import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { zipFiles } from './zip';

describe('zipFiles', () => {
  it('round-trips every file by name', () => {
    const zip = zipFiles([
      { name: 'a-page-1.pdf', bytes: new Uint8Array([1, 2]) },
      { name: 'a-page-2.pdf', bytes: new Uint8Array([3]) },
    ]);
    const entries = unzipSync(zip);
    expect(Object.keys(entries)).toEqual(['a-page-1.pdf', 'a-page-2.pdf']);
    expect(entries['a-page-2.pdf']).toEqual(new Uint8Array([3]));
  });
});
