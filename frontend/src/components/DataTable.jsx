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
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, total);

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-mist-100 border-b border-mist-300">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-4 py-3 font-semibold text-ink-600 whitespace-nowrap select-none"
                >
                  {col.sortable ? (
                    <button
                      onClick={() => onSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-ink-950 transition-colors"
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
                <td colSpan={columns.length} className="px-4 py-12 text-center text-ink-400">
                  No records match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.serial_number || row.complaint_number || idx}
                  className="border-b border-mist-200 last:border-0 hover:bg-mist-100/60 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-ink-800 whitespace-nowrap">
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-mist-300 bg-white">
        <span className="text-xs text-ink-500">
          Showing <span className="font-semibold text-ink-800">{startRow}-{endRow}</span> of{' '}
          <span className="font-semibold text-ink-800">{total.toLocaleString()}</span> records
        </span>
        <div className="flex items-center gap-1.5">
          <PageButton onClick={() => onPageChange(page - 1)} disabled={page <= 1} label="Prev" />
          <span className="text-xs font-medium text-ink-600 px-2">
            Page {page} of {totalPages}
          </span>
          <PageButton onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} label="Next" />
        </div>
      </div>
    </div>
  );
}

function PageButton({ onClick, disabled, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 text-xs font-semibold rounded-md border border-mist-300 text-ink-700 hover:bg-mist-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
