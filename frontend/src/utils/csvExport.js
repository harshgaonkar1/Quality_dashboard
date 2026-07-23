// ============================================================
// CSV Export Utility
// ------------------------------------------------------------
// Converts an array of row objects into a downloadable CSV file,
// entirely client-side (no server round trip needed once the
// data has been fetched).
// ============================================================

/**
 * @param {object[]} rows - array of flat objects
 * @param {{key:string, label:string}[]} columns - column definitions (order + headers)
 * @param {string} fileName
 */
export function exportToCSV(rows, columns, fileName = 'export.csv') {
  if (!rows || rows.length === 0) return;

  const escapeCell = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map((col) => escapeCell(col.label)).join(',');
  const body = rows
    .map((row) => columns.map((col) => escapeCell(row[col.key])).join(','))
    .join('\n');

  const csvContent = `${header}\n${body}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
