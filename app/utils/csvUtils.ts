/**
 * Utility pro export dat do CSV a stažení souboru v prohlížeči.
 * - Použij downloadCSV(filename, rows, columns, headerMap) pro univerzální export.
 * - columns: pole klíčů, které se mají exportovat (v pořadí)
 * - headerMap: volitelně mapování klíčů na popisky v hlavičce
 */
export function downloadCSV<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: string[],
  headerMap?: Record<string, string>
) {
  const csv = [
    columns.map(col => headerMap?.[col] || col).join(','),
    ...rows.map(row => columns.map(col => '"' + (row[col] ?? '') + '"').join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  // Typově správně pro IE fallback
  const nav = window.navigator as Navigator & { msSaveOrOpenBlob?: (blob: Blob, fileName: string) => void };
  if (typeof nav.msSaveOrOpenBlob === 'function') {
    nav.msSaveOrOpenBlob(blob, filename);
  } else {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
} 