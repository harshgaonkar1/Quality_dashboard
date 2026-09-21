import { formatDate } from './formatDate';

/**
 * @param {object[]} rows - array of flat objects
 * @param {{key:string, label:string}[]|string} columns - column definitions or fileName if 2 arguments
 * @param {string} [fileName]
 */
export function exportToCSV(rows, columns, fileName = 'export.csv') {
  if (!rows || rows.length === 0) return;

  let cols = columns;
  let file = fileName;

  if (typeof columns === 'string') {
    file = columns.endsWith('.csv') ? columns : `${columns}.csv`;
    cols = Object.keys(rows[0] || {}).map((k) => ({
      key: k,
      label: k.replace(/_/g, ' ').toUpperCase(),
    }));
  } else if (typeof file === 'string' && !file.endsWith('.csv')) {
    file = `${file}.csv`;
  }

  const dateKeys = new Set([
    'spu_created_date',
    'zmac_date',
    'doc',
    'doi',
    'dop',
    'fd_zbrn_date',
    'out_bound_del_date',
    'date',
    'action_plan_date',
  ]);

  const escapeCell = (value, key = '') => {
    if (value === null || value === undefined) return '';
    let val = value;
    if (key && dateKeys.has(key)) {
      val = formatDate(value);
    }
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = cols.map((col) => escapeCell(col.label || col.key)).join(',');
  const body = rows
    .map((row) => cols.map((col) => escapeCell(row[col.key], col.key)).join(','))
    .join('\n');

  const csvContent = `${header}\n${body}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', file);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

