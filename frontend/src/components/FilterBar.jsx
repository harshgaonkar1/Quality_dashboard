// ============================================================
// Filter Bar
// ------------------------------------------------------------
// Search input + active-scope indicator + Single Date Picker +
// CSV export trigger, used above details tables & dashboards.
// ============================================================

export default function FilterBar({
  search,
  onSearchChange,
  typeOfDamage = '',
  onDamageTypeChange,
  productCategory = '',
  onProductCategoryChange,
  ageingCategory = '',
  onAgeingCategoryChange,
  date = '',
  onDateChange,
  dateLabel = 'Filter Date',
  activeCategoryLabel,
  onClearCategory,
  onExport,
  exporting,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <div className="flex items-center gap-2 flex-wrap">
        {onSearchChange && (
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
              tabIndex={0}
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search complaint, spare, description, etc."
              className="input-field pl-9 w-full sm:w-64"
            />
          </div>
        )}

        {onDateChange && (
          <div className="flex items-center gap-2 bg-white dark:bg-ink-900 border border-mist-200 dark:border-ink-800 rounded-lg px-2.5 py-1.5 shadow-xs">
            <label htmlFor="single-date-picker" className="text-xs font-semibold text-ink-500 dark:text-mist-400 whitespace-nowrap">
              {dateLabel}:
            </label>
            <input
              tabIndex={0}
              id="single-date-picker"
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="text-xs font-medium text-ink-900 dark:text-mist-100 bg-transparent border border-mist-300 dark:border-ink-700 rounded px-2 py-1 focus:outline-none focus:border-signal cursor-pointer"
            />
            {date && (
              <button
                tabIndex={0}
                onClick={() => onDateChange('')}
                className="text-xs text-ink-500 dark:text-mist-400 hover:text-ink-950 dark:hover:text-white font-bold px-1"
                title="Clear date filter"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {onDamageTypeChange && (
          <div className="flex items-center gap-1.5 bg-white dark:bg-ink-900 border border-mist-200 dark:border-ink-800 rounded-lg px-2.5 py-1.5 shadow-xs">
            <label htmlFor="damage-type-select" className="text-xs font-semibold text-ink-500 dark:text-mist-400 whitespace-nowrap">
              Damage Type:
            </label>
            <select
              tabIndex={0}
              id="damage-type-select"
              value={typeOfDamage}
              onChange={(e) => onDamageTypeChange(e.target.value)}
              className="text-xs font-medium text-ink-900 dark:text-mist-100 bg-transparent border-none focus:outline-none cursor-pointer pr-1"
            >
              <option value="" className="dark:bg-ink-900 dark:text-mist-100">All Damage Types</option>
              <option value="Functional" className="dark:bg-ink-900 dark:text-mist-100">Functional Damages</option>
              <option value="Transit" className="dark:bg-ink-900 dark:text-mist-100">Transit Damages</option>
            </select>
          </div>
        )}

        {onProductCategoryChange && (
          <div className="flex items-center gap-1.5 bg-white dark:bg-ink-900 border border-mist-200 dark:border-ink-800 rounded-lg px-2.5 py-1.5 shadow-xs">
            <label htmlFor="product-category-select" className="text-xs font-semibold text-ink-500 dark:text-mist-400 whitespace-nowrap">
              Model Type:
            </label>
            <select
              tabIndex={0}
              id="product-category-select"
              value={productCategory}
              onChange={(e) => onProductCategoryChange(e.target.value)}
              className="text-xs font-medium text-ink-900 dark:text-mist-100 bg-transparent border-none focus:outline-none cursor-pointer pr-1"
            >
              <option value="" className="dark:bg-ink-900 dark:text-mist-100">All Models</option>
              <option value="TL" className="dark:bg-ink-900 dark:text-mist-100">TL Models</option>
              <option value="FL" className="dark:bg-ink-900 dark:text-mist-100">FL Models</option>
            </select>
          </div>
        )}

        {onAgeingCategoryChange && (
          <div className="flex items-center gap-1.5 bg-white dark:bg-ink-900 border border-mist-200 dark:border-ink-800 rounded-lg px-2.5 py-1.5 shadow-xs">
            <label htmlFor="ageing-category-select" className="text-xs font-semibold text-ink-500 dark:text-mist-400 whitespace-nowrap">
              Ageing:
            </label>
            <select
              tabIndex={0}
              id="ageing-category-select"
              value={ageingCategory}
              onChange={(e) => onAgeingCategoryChange(e.target.value)}
              className="text-xs font-medium text-ink-900 dark:text-mist-100 bg-transparent border-none focus:outline-none cursor-pointer pr-1"
            >
              <option value="" className="dark:bg-ink-900 dark:text-mist-100">All Ageing</option>
              <option value="installation-failure" className="dark:bg-ink-900 dark:text-mist-100">Installation Failure</option>
              <option value="0-3-months" className="dark:bg-ink-900 dark:text-mist-100">0-3 Months</option>
              <option value="1-year" className="dark:bg-ink-900 dark:text-mist-100">1 Year</option>
              <option value="2-year" className="dark:bg-ink-900 dark:text-mist-100">2 Year</option>
              <option value="3-year" className="dark:bg-ink-900 dark:text-mist-100">3 Year</option>
              <option value="4-year" className="dark:bg-ink-900 dark:text-mist-100">4 Year</option>
              <option value="more-than-4-years" className="dark:bg-ink-900 dark:text-mist-100">More than 4 Years</option>
            </select>
          </div>
        )}

        {activeCategoryLabel && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-signal/10 dark:bg-signal/20 text-signal-dark dark:text-signal-light text-xs font-semibold pl-3 pr-1.5 py-1.5">
            {activeCategoryLabel}
            <button
              tabIndex={0}
              onClick={onClearCategory}
              className="w-4 h-4 rounded-full hover:bg-signal/20 flex items-center justify-center"
              aria-label="Clear category filter"
            >
              ×
            </button>
          </span>
        )}
      </div>

      {onExport && (
        <button tabIndex={0} onClick={onExport} disabled={exporting} className="btn-secondary shrink-0">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-4 h-4">
            <path d="M10 3v9M6.5 8.5 10 12l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 15.5h12" strokeLinecap="round" />
          </svg>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      )}
    </div>
  );
}
