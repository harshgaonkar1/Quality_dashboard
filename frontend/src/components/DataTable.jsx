// ============================================================
// Data Table
// ------------------------------------------------------------
// Generic sortable table with pagination controls. Sorting state
// is controlled by the parent (server-side sort), so this component
// just renders headers and emits onSort/onPageChange events.
// ============================================================

export default function DataTable({
  columns,
  rows,
  sortBy,
  sortDir,
  onSort,
  page,
  pageSize,
  total,
  onPageChange,
  compact = false,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, total);

  const thPadding = compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm';
  const tdPadding = compact ? 'px-3 py-1.5 text-xs font-medium' : 'px-4 py-3 text-sm';
  const footerPadding = compact ? 'px-3 py-2' : 'px-4 py-3.5';

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className={`w-full ${compact ? 'text-xs' : 'text-sm'}`}>
          <thead>
            <tr className="bg-mist-100 dark:bg-ink-950/80 border-b border-mist-300 dark:border-ink-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left font-semibold text-ink-600 dark:text-mist-300 whitespace-nowrap select-none ${thPadding}`}
                >
                  {col.sortable ? (
                    <button
                      tabIndex={0}
                      onClick={() => onSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-ink-950 dark:hover:text-white transition-colors"
                    >
                      {col.label}
                      <SortIcon active={sortBy === col.key} dir={sortDir} />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={`text-center text-ink-400 dark:text-ink-500 ${compact ? 'px-3 py-6' : 'px-4 py-12'}`}>
                  No records match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.serial_number || row.complaint_number || idx}
                  className="border-b border-mist-200 dark:border-ink-800/60 last:border-0 hover:bg-mist-100/60 dark:hover:bg-ink-800/40 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`text-ink-800 dark:text-mist-200 whitespace-nowrap ${tdPadding}`}>
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={`flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-mist-300 dark:border-ink-800 bg-white dark:bg-ink-900 ${footerPadding}`}>
        <span className="text-xs text-ink-500 dark:text-mist-400">
          Showing <span className="font-semibold text-ink-800 dark:text-mist-200">{startRow}-{endRow}</span> of{' '}
          <span className="font-semibold text-ink-800 dark:text-mist-200">{total.toLocaleString()}</span> records
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <PageButton onClick={() => onPageChange(page - 1)} disabled={page <= 1} label="Prev" compact={compact} />
            <span className="text-xs font-medium text-ink-600 dark:text-mist-300 px-2">
              Page {page} of {totalPages}
            </span>
            <PageButton onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} label="Next" compact={compact} />
          </div>
        )}
      </div>
    </div>
  );
}

function PageButton({ onClick, disabled, label, compact }) {
  return (
    <button
      tabIndex={0}
      onClick={onClick}
      disabled={disabled}
      className={`${compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'} font-semibold rounded-md border border-mist-300 dark:border-ink-700 text-ink-700 dark:text-mist-300 hover:bg-mist-100 dark:hover:bg-ink-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
    >
      {label}
    </button>
  );
}

function SortIcon({ active, dir }) {
  return (
    <svg
      viewBox="0 0 10 10"
      className={`w-2.5 h-2.5 transition-transform ${active ? 'text-signal' : 'text-mist-400'} ${
        active && dir === 'ASC' ? 'rotate-180' : ''
      }`}
      fill="currentColor"
    >
      <path d="M5 7 1 3h8L5 7Z" />
    </svg>
  );
}
