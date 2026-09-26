/// <reference lib="webworker" />
import loadGhostscript from '@okathira/ghostpdl-wasm';
import wasmUrl from '@okathira/ghostpdl-wasm/gs.wasm?url';
import { compressPdf, type Ghostscript } from '../lib/compress/ghostscript';
import { serveJobs } from './host';
import type { CompressJobs } from './protocol';

let stderr = '';
let ghostscript: Promise<Ghostscript> | undefined;

function getGhostscript(): Promise<Ghostscript> {
  return (ghostscript ??= loadGhostscript({
    locateFile: (path: string) => (path.endsWith('.wasm') ? wasmUrl : path),
    print: () => {},
    printErr: (text: string) => {
      stderr += `${text}\n`;
    },
  }));
}

function readStderr(): string {
  const text = stderr;
  stderr = '';
  return text;
}

serveJobs<CompressJobs>(self, {
  compress: async ({ file, level }) => compressPdf(await getGhostscript(), file, level, readStderr),
});
