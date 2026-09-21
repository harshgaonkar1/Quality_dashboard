// ============================================================
// Excel Error Handler & Inspector Component
// ------------------------------------------------------------
// Displays comprehensive error diagnostics for Excel files:
// - Exact Table / Worksheet identification
// - Precise Cell coordinates (e.g., D14, A2) & Column letters
// - Specialized Date Format & Calendar bounds validation
// - Interactive Spreadsheet Grid with highlighted faulty cells
// - Filterable & searchable Error List
// - 1-click CSV error report export & clipboard copy
// ============================================================

import { useState, useMemo } from 'react';

export default function ExcelErrorHandler({
  result,
  error,
  onCommit,
  isCommitting = false,
  isCommitted = false,
  onRetry,
  onClose,
}) {
  const [activeTableKey, setActiveTableKey] = useState(null);
  const [activeTab, setActiveTab] = useState('grid'); // 'grid' | 'list'
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'DATE' | 'MISSING' | 'RULE' | 'DUPLICATE'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCellError, setSelectedCellError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Normalize results from backend
  const tables = useMemo(() => {
    if (!result || typeof result !== 'object') return [];
    return Object.entries(result).map(([key, data]) => ({
      key,
      title: getTableFriendlyName(key, data.uploadType),
      fileName: data.fileName || key,
      sheetName: data.sheetName || 'Sheet1',
      sessionToken: data.sessionToken || null,
      validationOnly: Boolean(data.validationOnly),
      validRecordsCount: data.validRecordsCount ?? (data.totalRows - (data.skippedRows || 0) - (data.filteredRows || 0)),
      status: data.status || 'UNKNOWN',
      totalRows: data.totalRows || 0,
      insertedRows: data.insertedRows || 0,
      duplicateRows: data.duplicateRows || 0,
      skippedRows: data.skippedRows || 0,
      filteredRows: data.filteredRows || 0,
      headers: data.headers || [],
      cellErrors: data.cellErrors || [],
      errorBreakdown: data.errorBreakdown || {
        dateErrors: 0,
        missingFields: 0,
        ruleViolations: 0,
        duplicates: 0,
        totalCellErrors: 0,
      },
      previewRows: data.previewRows || [],
      skippedDetails: data.skippedDetails || [],
    }));
  }, [result]);

  // Set initial active table
  const currentTableKey = activeTableKey || tables[0]?.key;
  const currentTable = tables.find((t) => t.key === currentTableKey) || tables[0];

  // Check if any table is in validation preview mode (not yet committed)
  const isValidationMode = tables.some((t) => t.validationOnly) && !isCommitted;

  // Filter cell errors
  const filteredErrors = useMemo(() => {
    if (!currentTable) return [];
    let list = currentTable.cellErrors || [];

    if (filterType === 'DATE') {
      list = list.filter((e) => e.errorType?.includes('DATE'));
    } else if (filterType === 'MISSING') {
      list = list.filter((e) => e.errorType?.includes('MISSING'));
    } else if (filterType === 'RULE') {
      list = list.filter((e) => e.errorType?.includes('RULE') || e.errorType?.includes('STATUS'));
    } else if (filterType === 'DUPLICATE') {
      list = list.filter((e) => e.errorType?.includes('DUPLICATE'));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.cell?.toLowerCase().includes(q) ||
          String(e.rowNumber).includes(q) ||
          e.colName?.toLowerCase().includes(q) ||
          e.message?.toLowerCase().includes(q) ||
          e.value?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [currentTable, filterType, searchQuery]);

  // Create a cell error lookup map: "rowNumber_colLetter" or "cell" -> errorObj
  const cellErrorMap = useMemo(() => {
    if (!currentTable) return new Map();
    const map = new Map();
    (currentTable.cellErrors || []).forEach((err) => {
      if (err.cell) map.set(err.cell.toUpperCase(), err);
      if (err.rowNumber && err.colLetter) {
        map.set(`${err.colLetter.toUpperCase()}${err.rowNumber}`, err);
      }
      if (err.rowNumber && err.colName) {
        map.set(`${err.rowNumber}_${err.colName.toLowerCase()}`, err);
      }
    });
    return map;
  }, [currentTable]);

  // If there is only a generic error with no table results
  if (error && (!tables || tables.length === 0)) {
    return (
      <div className="panel border-danger/40 bg-danger/5 dark:bg-danger/10 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-danger/10 text-danger shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-display font-bold text-ink-950 dark:text-mist-100 text-lg">Upload Failed</h3>
            <p className="text-sm text-ink-700 dark:text-mist-300 mt-1">{error}</p>
          </div>
          {onRetry && (
            <button onClick={onRetry} className="btn-secondary text-xs px-3 py-1.5 shrink-0">
              Retry Upload
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!currentTable) return null;

  // CSV Export
  function handleExportCSV() {
    if (!currentTable || !currentTable.cellErrors?.length) return;
    const headers = ['Table', 'Sheet', 'Cell', 'Row', 'Column Letter', 'Column Name', 'Faulty Value', 'Expected Format', 'Error Type', 'Error Message', 'Suggested Fix'];
    const rows = currentTable.cellErrors.map((e) => [
      `"${currentTable.title}"`,
      `"${currentTable.sheetName}"`,
      `"${e.cell || ''}"`,
      `"${e.rowNumber || ''}"`,
      `"${e.colLetter || ''}"`,
      `"${e.colName || ''}"`,
      `"${String(e.value || '').replace(/"/g, '""')}"`,
      `"${String(e.expected || '').replace(/"/g, '""')}"`,
      `"${e.errorType || ''}"`,
      `"${String(e.message || '').replace(/"/g, '""')}"`,
      `"${String(e.suggestedFix || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentTable.key}_errors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Copy Error Summary to Clipboard
  function handleCopyDetails() {
    if (!currentTable || !currentTable.cellErrors?.length) return;
    const text = currentTable.cellErrors
      .map(
        (e) =>
          `[${currentTable.title}] Cell ${e.cell} (Row ${e.rowNumber}, Col '${e.colName}'):\n` +
          `  • Value: "${e.value}"\n` +
          `  • Error: ${e.message}\n` +
          `  • Expected: ${e.expected}\n` +
          `  • Fix: ${e.suggestedFix}\n`
      )
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const breakdown = currentTable.errorBreakdown || {};
  const hasErrors = (currentTable.cellErrors?.length || 0) > 0;
  const validCount = currentTable.validRecordsCount || Math.max(0, currentTable.totalRows - currentTable.skippedRows);

  return (
    <div className="panel p-6 space-y-6 border-mist-300 dark:border-ink-800 shadow-xl bg-white dark:bg-ink-900 transition-all">
      {/* STEP 2 CONFIRMATION & COMMITMENT ACTION BAR */}
      {isValidationMode && onCommit && (
        <div
          className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg transition-all ${hasErrors
            ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/40 text-ink-900 dark:text-mist-100'
            : 'bg-signal/15 dark:bg-signal/20 border-signal/40 text-ink-900 dark:text-mist-100'
            }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">{hasErrors ? '⚠️' : '✅'}</span>
              <h4 className="font-display text-base font-bold">
                {hasErrors ? 'Preview Ready — Cell Errors Detected' : 'Excel Validation Passed (100% OK)'}
              </h4>
            </div>
            <p className="text-xs text-ink-600 dark:text-mist-300">
              {hasErrors
                ? `Found ${currentTable.cellErrors.length} cell issue(s) across ${currentTable.skippedRows} row(s). Review highlighted red cells below before uploading.`
                : `All ${validCount} valid row(s) in "${currentTable.fileName}" are ready to be saved into the database${currentTable.filteredRows > 0 ? ` (${currentTable.filteredRows} rows filtered out based on business criteria)` : ''}.`}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={isCommitting}
                className="btn-secondary text-xs py-2 px-3.5"
              >
                Cancel & Choose Other File
              </button>
            )}

            <button
              type="button"
              onClick={onCommit}
              disabled={isCommitting || validCount === 0}
              className={`btn-primary text-xs py-2.5 px-5 font-bold shadow-md flex items-center gap-2 ${hasErrors
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-signal-dark dark:bg-signal text-white dark:text-ink-950'
                }`}
            >
              {isCommitting ? (
                <>
                  <span className="animate-spin text-sm">⏳</span>
                  <span>Saving to Database…</span>
                </>
              ) : hasErrors ? (
                <>
                  <span>🚀 Upload Valid Rows ({validCount})</span>
                </>
              ) : (
                <>
                  <span>🚀 Confirm & Upload to Database ({validCount} Rows)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Upload Completed Feedback */}
      {isCommitted && (
        <div className="p-4 rounded-xl border border-signal/40 bg-signal/15 dark:bg-signal/20 flex items-center justify-between gap-3 text-signal-dark dark:text-signal-light">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <span className="text-lg">🎉</span>
            <span>
              Upload completed successfully! {currentTable.insertedRows} row(s) were stored into the database.
            </span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs underline font-bold hover:opacity-80"
            >
              Upload New File
            </button>
          )}
        </div>
      )}
      {/* Top Header & Table Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-mist-200 dark:border-ink-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📊</span>
            <h3 className="font-display text-lg font-bold text-ink-950 dark:text-mist-100">
              Excel Diagnostic & Cell Error Inspector
            </h3>
            <StatusBadge status={currentTable.status} />
          </div>
          <p className="text-xs text-ink-500 dark:text-mist-400 mt-1">
            File: <strong className="text-ink-800 dark:text-mist-200">{currentTable.fileName}</strong> | Sheet:{' '}
            <strong className="text-ink-800 dark:text-mist-200">{currentTable.sheetName}</strong>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopyDetails}
            disabled={!currentTable.cellErrors?.length}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            title="Copy all error details to clipboard"
          >
            <span>{copied ? '✅ Copied!' : '📋 Copy Error Log'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!currentTable.cellErrors?.length}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            title="Download CSV report of all faulty cells"
          >
            <span>📥 Download Error CSV</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs py-2 px-2.5 text-ink-400 hover:text-ink-900"
              title="Close error inspector"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* File / Table Selection Tabs (if multiple uploaded files) */}
      {tables.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-mist-200/60 dark:border-ink-800/60">
          {tables.map((t) => {
            const isSelected = t.key === currentTableKey;
            const errCount = t.cellErrors?.length || t.skippedRows || 0;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setActiveTableKey(t.key);
                  setSelectedCellError(null);
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${isSelected
                  ? 'bg-ink-900 text-white dark:bg-signal dark:text-ink-950 shadow-sm'
                  : 'bg-mist-100 dark:bg-ink-800 text-ink-600 dark:text-mist-300 hover:bg-mist-200 dark:hover:bg-ink-700'
                  }`}
              >
                <span>{t.title}</span>
                {errCount > 0 ? (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isSelected ? 'bg-danger text-white' : 'bg-danger/20 text-danger'
                      }`}
                  >
                    {errCount}
                  </span>
                ) : (
                  <span className="text-[10px] text-signal font-bold">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Diagnostic Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="Total Rows" value={currentTable.totalRows} accent="text-ink-900 dark:text-mist-100" />
        <MetricCard
          label="Valid / Insertable"
          value={validCount}
          accent="text-signal-dark dark:text-signal font-bold"
          sub={currentTable.insertedRows > 0 ? `${currentTable.insertedRows} stored in DB` : 'Ready to upload'}
        />
        <MetricCard
          label="⚙️ Filtered Out"
          value={currentTable.filteredRows || 0}
          accent="text-ink-500 dark:text-mist-400"
          sub="Excluded criteria"
        />
        <MetricCard
          label="📅 Date Issues"
          value={breakdown.dateErrors || 0}
          accent={breakdown.dateErrors > 0 ? 'text-danger dark:text-red-400 font-bold' : 'text-ink-700'}
          highlight={breakdown.dateErrors > 0}
          sub="DOC / DOI format errors"
        />
        <MetricCard
          label="⚠️ Missing Required"
          value={breakdown.missingFields || 0}
          accent={breakdown.missingFields > 0 ? 'text-amber dark:text-amber-400 font-bold' : 'text-ink-700'}
          sub="Blank DOC / DOI / Serial"
        />
        <MetricCard
          label="📑 Duplicate Entries"
          value={breakdown.duplicates || 0}
          accent={breakdown.duplicates > 0 ? 'text-danger dark:text-red-400 font-bold' : 'text-ink-700'}
          highlight={breakdown.duplicates > 0}
          sub="Duplicate serials/claims"
        />
      </div>

      {/* Date Format Warning Callout if Date Errors Exist */}
      {(breakdown.dateErrors > 0 || currentTable.cellErrors?.some((e) => e.errorType?.includes('DATE'))) && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 dark:bg-danger/10 p-4 flex items-start gap-3">
          <span className="text-xl">📅</span>
          <div className="text-xs space-y-1 text-ink-800 dark:text-mist-200">
            <p className="font-bold text-danger dark:text-red-400 text-sm">
              Date Format Issue Detected ({breakdown.dateErrors} date cell{breakdown.dateErrors !== 1 ? 's' : ''})
            </p>
            <p>
              One or more date cells contain unparseable date strings, invalid days/months (e.g. Feb 30th), or out-of-range years.
            </p>
            <p className="text-ink-600 dark:text-mist-400">
              💡 <strong>Supported Date Formats:</strong> <code>MM-DD-YYYY</code> (e.g. <code>08-15-2024</code>),{' '}
              <code>MM/DD/YYYY</code> (e.g. <code>08/15/2024</code>), <code>YYYY-MM-DD</code>, or Excel Short Date cells.
            </p>
          </div>
        </div>
      )}

      {/* Duplicate Entries Warning Callout if Duplicates Exist */}
      {(breakdown.duplicates > 0 || currentTable.cellErrors?.some((e) => e.errorType?.includes('DUPLICATE'))) && (
        <div className="rounded-xl border border-amber/40 bg-amber/5 dark:bg-amber/10 p-4 flex items-start gap-3">
          <span className="text-xl">📑</span>
          <div className="text-xs space-y-1 text-ink-800 dark:text-mist-200">
            <p className="font-bold text-amber-700 dark:text-amber-400 text-sm">
              Duplicate Entries Detected ({breakdown.duplicates} duplicate{breakdown.duplicates !== 1 ? 's' : ''})
            </p>
            <p>
              One or more serial numbers or part replacement records appear multiple times in this Excel file.
            </p>
            <p className="text-ink-600 dark:text-mist-400">
              💡 <strong>Action:</strong> Click on the <span className="font-semibold text-danger">Duplicates</span> filter pill below to view duplicate rows and cell locations.
            </p>
          </div>
        </div>
      )}

      {/* View Switcher Tabs & Search/Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-mist-100 dark:bg-ink-800/80 p-1 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setActiveTab('grid')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === 'grid'
              ? 'bg-white dark:bg-ink-900 text-ink-950 dark:text-mist-100 shadow-sm'
              : 'text-ink-500 dark:text-mist-400 hover:text-ink-900 dark:hover:text-mist-100'
              }`}
          >
            <span>📊 Excel Grid View</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === 'list'
              ? 'bg-white dark:bg-ink-900 text-ink-950 dark:text-mist-100 shadow-sm'
              : 'text-ink-500 dark:text-mist-400 hover:text-ink-900 dark:hover:text-mist-100'
              }`}
          >
            <span>📝 Error Detail Table</span>
            {currentTable.cellErrors?.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-danger/15 text-danger font-bold">
                {currentTable.cellErrors.length}
              </span>
            )}
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <FilterPill label="All Errors" active={filterType === 'ALL'} onClick={() => setFilterType('ALL')} count={currentTable.cellErrors?.length || 0} />
          <FilterPill
            label="📅 Date Errors"
            active={filterType === 'DATE'}
            onClick={() => setFilterType('DATE')}
            count={breakdown.dateErrors || 0}
            danger={breakdown.dateErrors > 0}
          />
          <FilterPill
            label="⚠️ Missing Fields"
            active={filterType === 'MISSING'}
            onClick={() => setFilterType('MISSING')}
            count={breakdown.missingFields || 0}
          />
          <FilterPill
            label="📑 Duplicates"
            active={filterType === 'DUPLICATE'}
            onClick={() => setFilterType('DUPLICATE')}
            count={breakdown.duplicates || 0}
            danger={breakdown.duplicates > 0}
          />
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Cell coordinate (e.g. D14, A2), Row #, Column Name, or Value..."
          className="input-field text-xs pl-9 pr-8"
        />
        <span className="absolute left-3 top-2.5 text-mist-400 dark:text-ink-500 text-sm">🔍</span>
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-2 text-ink-400 hover:text-ink-700 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* VIEW 1: INTERACTIVE EXCEL GRID INSPECTOR */}
      {activeTab === 'grid' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-ink-500 dark:text-mist-400">
            <p>
              💡 <strong>Spreadsheet Grid:</strong> Click on any highlighted <span className="text-danger font-semibold">red cell</span> to inspect its exact error coordinate, faulty format, and fix suggestion.
            </p>
            <span className="text-[11px] text-ink-400">
              Showing {currentTable.previewRows?.length || 0} rows
            </span>
          </div>

          <div className="overflow-x-auto border border-mist-300 dark:border-ink-800 rounded-xl max-h-[480px] overflow-y-auto bg-mist-50/50 dark:bg-ink-950/50">
            <table className="w-full text-xs border-collapse text-left select-text font-mono">
              {/* Header with Excel Column Letters (A, B, C...) + Header Names */}
              <thead className="sticky top-0 z-10 bg-mist-200 dark:bg-ink-800 text-ink-700 dark:text-mist-200 shadow-sm">
                <tr>
                  <th className="p-2 border-r border-b border-mist-300 dark:border-ink-700 text-center w-12 bg-mist-300/80 dark:bg-ink-700 font-bold text-ink-500 dark:text-mist-400">
                    #
                  </th>
                  {currentTable.headers?.map((h) => (
                    <th
                      key={h.header}
                      className="p-2.5 border-r border-b border-mist-300 dark:border-ink-700 whitespace-nowrap min-w-[140px]"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-semibold text-ink-900 dark:text-mist-100">{h.header}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-mist-300/70 dark:bg-ink-900 text-ink-600 dark:text-mist-300">
                          {h.colLetter}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Data Rows */}
              <tbody className="divide-y divide-mist-200 dark:divide-ink-800 font-sans">
                {currentTable.previewRows?.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(1, (currentTable.headers?.length || 0) + 1)} className="p-8 text-center text-ink-400">
                      No rows available to display.
                    </td>
                  </tr>
                ) : (
                  currentTable.previewRows.map((row) => {
                    const rowNum = row.rowNumber;
                    return (
                      <tr
                        key={rowNum}
                        className={`hover:bg-signal/5 transition-colors ${row.hasError ? 'bg-danger/5 dark:bg-danger/10' : 'bg-white dark:bg-ink-900'
                          }`}
                      >
                        {/* Row Number Column */}
                        <td className="p-2 border-r border-mist-200 dark:border-ink-800 text-center font-mono text-[11px] font-bold text-ink-400 dark:text-mist-500 bg-mist-100/70 dark:bg-ink-800/50">
                          {rowNum}
                        </td>

                        {/* Cell Values */}
                        {currentTable.headers?.map((h) => {
                          const cellAddress = `${h.colLetter}${rowNum}`;
                          const cellError = cellErrorMap.get(cellAddress) || cellErrorMap.get(`${rowNum}_${h.header.toLowerCase()}`);
                          const cellValue = row.data?.[h.header];
                          const isDateCol = h.header.toLowerCase().includes('date') || h.header.toLowerCase().includes('doc') || h.header.toLowerCase().includes('doi') || h.header.toLowerCase().includes('dop');

                          return (
                            <td
                              key={h.header}
                              onClick={() => cellError && setSelectedCellError(cellError)}
                              className={`p-2 border-r border-mist-200 dark:border-ink-800 max-w-[200px] truncate text-xs transition-all ${cellError
                                ? 'bg-danger/15 dark:bg-danger/25 text-danger font-semibold border-2 border-danger/80 cursor-pointer shadow-inner animate-pulse'
                                : 'text-ink-800 dark:text-mist-200'
                                }`}
                              title={
                                cellError
                                  ? `[Cell ${cellAddress}] Error: ${cellError.message} (Click to inspect)`
                                  : cellValue !== null && cellValue !== undefined
                                    ? String(cellValue)
                                    : ''
                              }
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="truncate">
                                  {cellValue === null || cellValue === undefined || String(cellValue).trim() === '' ? (
                                    <span className="text-mist-400 dark:text-ink-600 italic">(empty)</span>
                                  ) : (
                                    String(cellValue)
                                  )}
                                </span>
                                {cellError && (
                                  <span className="shrink-0 px-1 py-0.2 rounded text-[10px] font-bold bg-danger text-white">
                                    {isDateCol ? '📅 ' : ''}
                                    {cellAddress}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: DETAILED CELL ERROR TABLE */}
      {activeTab === 'list' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-ink-500 dark:text-mist-400">
            <p>
              Showing <strong>{filteredErrors.length}</strong> cell error{filteredErrors.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="overflow-x-auto border border-mist-300 dark:border-ink-800 rounded-xl max-h-[480px] overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-mist-200 dark:bg-ink-800 text-ink-700 dark:text-mist-200">
                <tr>
                  <th className="p-3 font-bold">Cell</th>
                  <th className="p-3 font-bold">Column Name</th>
                  <th className="p-3 font-bold">Row #</th>
                  <th className="p-3 font-bold">Faulty Value</th>
                  <th className="p-3 font-bold">Expected Format</th>
                  <th className="p-3 font-bold">Error Category</th>
                  <th className="p-3 font-bold">Explanation & Suggested Fix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist-200 dark:divide-ink-800 bg-white dark:bg-ink-900">
                {filteredErrors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-ink-400 dark:text-mist-500">
                      No errors matching the filter.
                    </td>
                  </tr>
                ) : (
                  filteredErrors.map((err, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setSelectedCellError(err)}
                      className="hover:bg-mist-100 dark:hover:bg-ink-800 cursor-pointer transition-colors"
                    >
                      <td className="p-3 font-mono font-bold text-danger">
                        <span className="px-2 py-1 rounded bg-danger/10 text-danger border border-danger/30">
                          {err.cell || `Row ${err.rowNumber}`}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-ink-900 dark:text-mist-100">
                        {err.colName}
                        {err.colLetter && (
                          <span className="ml-1 text-[10px] text-ink-400 font-mono">({err.colLetter})</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-ink-600 dark:text-mist-300">
                        Row {err.rowNumber}
                      </td>
                      <td className="p-3 font-mono text-red-600 dark:text-red-400 bg-danger/5 dark:bg-danger/15 rounded max-w-[150px] truncate">
                        {err.value || '(empty)'}
                      </td>
                      <td className="p-3 text-ink-600 dark:text-mist-300 max-w-[160px] truncate text-[11px]">
                        {err.expected || '-'}
                      </td>
                      <td className="p-3">
                        <ErrorTypeBadge type={err.errorType} />
                      </td>
                      <td className="p-3 space-y-0.5 max-w-[280px]">
                        <p className="font-semibold text-ink-900 dark:text-mist-100">{err.message}</p>
                        {err.suggestedFix && (
                          <p className="text-[11px] text-ink-500 dark:text-mist-400 italic">
                            💡 Fix: {err.suggestedFix}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* POPUP / MODAL INSPECTOR FOR SELECTED CELL */}
      {selectedCellError && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedCellError(null)}
        >
          <div
            className="bg-white dark:bg-ink-900 border border-mist-300 dark:border-ink-700 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-mist-200 dark:border-ink-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-danger/10 text-danger text-lg font-bold">
                  {selectedCellError.cell || `Row ${selectedCellError.rowNumber}`}
                </div>
                <div>
                  <h4 className="font-display font-bold text-ink-950 dark:text-mist-100">
                    Cell Error Diagnostic
                  </h4>
                  <p className="text-xs text-ink-500 dark:text-mist-400">
                    Table: <strong>{currentTable.title}</strong> | Sheet: <strong>{currentTable.sheetName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCellError(null)}
                className="text-ink-400 hover:text-ink-800 dark:hover:text-mist-100 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-mist-100 dark:bg-ink-800 p-3 rounded-xl font-mono">
                <div>
                  <span className="text-[10px] text-ink-400 uppercase block font-sans">Column Header</span>
                  <strong className="text-ink-900 dark:text-mist-100">{selectedCellError.colName}</strong>
                  {selectedCellError.colLetter && (
                    <span className="text-ink-500 ml-1">(Col {selectedCellError.colLetter})</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 uppercase block font-sans">Row Number</span>
                  <strong className="text-ink-900 dark:text-mist-100">Row {selectedCellError.rowNumber}</strong>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-ink-500 dark:text-mist-400 block mb-1">
                  Current Cell Value
                </span>
                <div className="p-2.5 rounded-lg font-mono bg-danger/10 border border-danger/30 text-danger text-sm font-semibold break-all">
                  {selectedCellError.value || '(empty)'}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-ink-500 dark:text-mist-400 block mb-1">
                  Expected Format / Requirement
                </span>
                <div className="p-2.5 rounded-lg bg-mist-100 dark:bg-ink-800 text-ink-800 dark:text-mist-200">
                  {selectedCellError.expected || 'Valid data matching column requirements'}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-ink-500 dark:text-mist-400 block mb-1">
                  Diagnostic Message
                </span>
                <p className="text-ink-800 dark:text-mist-200 font-medium">
                  {selectedCellError.message}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-signal/10 border border-signal/30 text-signal-dark dark:text-signal-light space-y-1">
                <strong className="block text-[11px] font-bold">💡 Recommended Fix:</strong>
                <p>{selectedCellError.suggestedFix || 'Update the cell value in your Excel file and re-upload.'}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedCellError(null)}
                className="btn-primary text-xs py-2 px-4"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Friendly Title Mapping
function getTableFriendlyName(key, uploadType) {
  if (uploadType === 'PRODUCT_REPLACEMENT' || key === 'productReplacement') return 'Product Replacement Table';
  if (uploadType === 'PART_REPLACEMENT' || key === 'partReplacement') return 'Part Replacement Table';
  if (uploadType === 'PART_GROUPING' || key === 'partGrouping') return 'Part Grouping Master Table';
  return key;
}

function MetricCard({ label, value, accent = 'text-ink-900 dark:text-mist-100', sub, highlight }) {
  return (
    <div
      className={`p-3 rounded-xl border transition-all ${highlight
        ? 'bg-danger/10 border-danger/40 shadow-sm'
        : 'bg-mist-100/80 dark:bg-ink-800/80 border-mist-200 dark:border-ink-700/60'
        }`}
    >
      <p className="text-[11px] font-semibold text-ink-500 dark:text-mist-400 truncate">{label}</p>
      <p className={`text-lg font-display font-bold tabular-nums mt-0.5 ${accent}`}>
        {(value || 0).toLocaleString()}
      </p>
      {sub && <p className="text-[10px] text-ink-400 dark:text-mist-500 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

function FilterPill({ label, active, onClick, count = 0, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${active
        ? 'bg-ink-900 text-white dark:bg-signal dark:text-ink-950 shadow-sm'
        : danger
          ? 'bg-danger/10 text-danger hover:bg-danger/20'
          : 'bg-mist-200 dark:bg-ink-800 text-ink-600 dark:text-mist-300 hover:bg-mist-300 dark:hover:bg-ink-700'
        }`}
    >
      <span>{label}</span>
      {count > 0 && (
        <span
          className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${active ? 'bg-white/20 text-white dark:bg-ink-950 dark:text-signal' : 'bg-mist-300 dark:bg-ink-700 text-ink-700 dark:text-mist-300'
            }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function StatusBadge({ status }) {
  const styles = {
    SUCCESS: 'bg-signal/15 text-signal-dark dark:bg-signal/20 dark:text-signal-light border border-signal/30',
    PARTIAL: 'bg-amber/15 text-amber dark:bg-amber-500/20 dark:text-amber-400 border border-amber/30',
    FAILED: 'bg-danger/15 text-danger dark:bg-danger/20 dark:text-red-400 border border-danger/30',
  };
  return (
    <span
      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${styles[status] || 'bg-mist-200 text-ink-600'
        }`}
    >
      {status}
    </span>
  );
}

function ErrorTypeBadge({ type }) {
  if (!type) return null;
  if (type.includes('DATE')) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger/15 text-danger border border-danger/30">
        📅 Date Format
      </span>
    );
  }
  if (type.includes('MISSING')) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber/15 text-amber dark:text-amber-400 border border-amber/30">
        ⚠️ Missing Value
      </span>
    );
  }
  if (type.includes('DUPLICATE')) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
        📑 Duplicate Key
      </span>
    );
  }
  if (type.includes('TYPE')) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
        🔢 Data Type
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-mist-300 dark:bg-ink-700 text-ink-700 dark:text-mist-200">
      ⚙️ Business Rule
    </span>
  );
}
