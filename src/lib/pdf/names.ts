/** File name without a trailing .pdf. Kept free of pdf-lib so UI bundles stay small. */
export function baseName(fileName: string): string {
  return fileName.replace(/\.pdf$/i, '');
}
