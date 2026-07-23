// ============================================================
// Filter Bar
// ------------------------------------------------------------
// Search input + active-scope indicator + CSV export trigger,
// used above the details table.
// ============================================================

export default function FilterBar({
  search,
  onSearchChange,
  typeOfDamage = '',
  onDamageTypeChange,
  activeCategoryLabel,
  onClearCategory,
  onExport,
  exporting,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mist-400"
          >
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="m17 17-3.8-3.8" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search complaint, spare, description, etc."
            className="input-field pl-9 w-full sm:w-72"
          />
        </div>

        {onDamageTypeChange && (
          <div className="flex items-center gap-1.5 bg-white border border-mist-200 rounded-lg px-2.5 py-1.5 shadow-xs">
            <label htmlFor="damage-type-select" className="text-xs font-semibold text-ink-500 whitespace-nowrap">
              Damage Type:
            </label>
            <select
              id="damage-type-select"
              value={typeOfDamage}
              onChange={(e) => onDamageTypeChange(e.target.value)}
              className="text-xs font-medium text-ink-900 bg-transparent border-none focus:outline-none cursor-pointer pr-1"
            >
              <option value="">All Damage Types</option>
              <option value="Functional">Functional Damages</option>
              <option value="Transit">Transit Damages</option>
            </select>
          </div>
        )}

        {activeCategoryLabel && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-signal/10 text-signal-dark text-xs font-semibold pl-3 pr-1.5 py-1.5">
            {activeCategoryLabel}
            <button
              onClick={onClearCategory}
              className="w-4 h-4 rounded-full hover:bg-signal/20 flex items-center justify-center"
              aria-label="Clear category filter"
            >
              ×
            </button>
          </span>
        )}
      </div>

      <button onClick={onExport} disabled={exporting} className="btn-secondary shrink-0">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-4 h-4">
          <path d="M10 3v9M6.5 8.5 10 12l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 15.5h12" strokeLinecap="round" />
        </svg>
        {exporting ? 'Exporting…' : 'Export CSV'}
      </button>
    </div>
  );
}
