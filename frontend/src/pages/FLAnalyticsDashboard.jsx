// ============================================================
// FL Analytics Dashboard Page
// ------------------------------------------------------------
// Dedicated dashboard focusing on Front Load (FL) Part Replacement
// for the latest uploaded date data in the DB.
//
// Features 3 Core Graphs:
// 1. Part Replacement of FL (Front Load ageing distribution)
// 2. Part Replacement of TL (Top Load distribution / zero state)
// 3. Machine Replacement by FL Model Capacity & RPM speed
//    (extracts e.g. 9014 -> 9kg & 1400rpm, 7012 -> 7kg & 1200rpm,
//     8014, 6512, 6514, etc. from table: product_replacement)
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';
import { fetchDashboardSummary as fetchPartSummary, fetchDashboardDetails as fetchPartDetails, fetchDetailsForExport as fetchPartExport, savePartComment } from '../services/partReplacementService';
import { fetchDetailsForExport as fetchProductExport, saveProductComment } from '../services/productReplacementService';
import FLPartReplacementChart from '../components/FLPartReplacementChart';
import TLPartReplacementChart from '../components/TLPartReplacementChart';
import FLMachineCapacityRPMChart from '../components/FLMachineCapacityRPMChart';
import FilterBar from '../components/FilterBar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import { formatDate } from '../utils/formatDate';
import { exportToCSV } from '../utils/csvExport';
import { parseFLModelSpecs } from '../utils/modelSpecParser';
import { useAdmin } from '../context/AdminContext';

export default function FLAnalyticsDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, openAdminModal } = useAdmin();

  // Date filter defaults to 'latest'
  const dateParam = searchParams.get('date') || 'latest';
  const [selectedDate, setSelectedDate] = useState(dateParam);

  // Table active tab: 'parts' | 'machines'
  const [tableTab, setTableTab] = useState('parts');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // 1. Fetch Part Replacement Summary (returns cards, total, flCount, tlCount, activeDate, latestDate)
  const fetchPartSummaryFn = useCallback(
    () => fetchPartSummary({ date: selectedDate || 'latest' }),
    [selectedDate]
  );
  const {
    data: partSummaryResponse,
    loading: partSummaryLoading,
    error: partSummaryError,
    refetch: refetchPartSummary,
  } = useFetch(fetchPartSummaryFn, [fetchPartSummaryFn]);

  const partData = partSummaryResponse?.data || null;
  const activeDate = partData?.activeDate || (selectedDate !== 'latest' ? selectedDate : '');
  const latestDate = partData?.latestDate || '';

  // 2. Fetch Product Replacement Rows for Graph 3 (FL Capacity & RPM analysis)
  const fetchProductRowsFn = useCallback(
    () => fetchProductExport({ productCategory: 'FL', date: selectedDate || 'latest' }),
    [selectedDate]
  );
  const {
    data: productRowsResponse,
    loading: productLoading,
    error: productError,
    refetch: refetchProductRows,
  } = useFetch(fetchProductRowsFn, [fetchProductRowsFn]);

  const productRows = productRowsResponse?.data?.rows || [];

  // 3. Fetch Part Details for Drilldown Table
  const fetchPartDetailsFn = useCallback(
    () => fetchPartExport({ subCategory: 'FL', date: selectedDate || 'latest' }),
    [selectedDate]
  );
  const {
    data: partDetailsResponse,
    loading: partDetailsLoading,
    refetch: refetchPartDetails,
  } = useFetch(fetchPartDetailsFn, [fetchPartDetailsFn]);

  const partRows = partDetailsResponse?.data?.rows || [];

  // Filtered rows for drilldown table
  const filteredPartRows = useMemo(() => {
    if (!debouncedSearch) return partRows;
    const s = debouncedSearch.toLowerCase();
    return partRows.filter((r) =>
      (r.complaint_number && r.complaint_number.toLowerCase().includes(s)) ||
      (r.model && r.model.toLowerCase().includes(s)) ||
      (r.serial_number && r.serial_number.toLowerCase().includes(s)) ||
      (r.item_code && r.item_code.toLowerCase().includes(s)) ||
      (r.description && r.description.toLowerCase().includes(s)) ||
      (r.branch && r.branch.toLowerCase().includes(s))
    );
  }, [partRows, debouncedSearch]);

  const filteredProductRows = useMemo(() => {
    if (!debouncedSearch) return productRows;
    const s = debouncedSearch.toLowerCase();
    return productRows.filter((r) =>
      (r.complaint_number && r.complaint_number.toLowerCase().includes(s)) ||
      (r.model && r.model.toLowerCase().includes(s)) ||
      (r.serial_number && r.serial_number.toLowerCase().includes(s)) ||
      (r.branch && r.branch.toLowerCase().includes(s)) ||
      (r.type_of_damage && r.type_of_damage.toLowerCase().includes(s))
    );
  }, [productRows, debouncedSearch]);

  function handleDateChange(newDate) {
    setSelectedDate(newDate || 'latest');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newDate) next.set('date', newDate);
      else next.delete('date');
      return next;
    });
  }

  function handleExportCurrentTable() {
    if (tableTab === 'parts') {
      exportToCSV(filteredPartRows, `FL_Part_Replacements_${activeDate || 'all'}`);
    } else {
      exportToCSV(filteredProductRows, `FL_Machine_Replacements_${activeDate || 'all'}`);
    }
  }

  const isLoading = partSummaryLoading || (productLoading && productRows.length === 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              FL Focused Dashboard
            </span>
            {activeDate && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-mist-200 dark:bg-ink-800 text-ink-700 dark:text-mist-300 border border-mist-300 dark:border-ink-700">
                Date: <strong className="text-ink-900 dark:text-mist-100">{formatDate(activeDate)}</strong>
                {selectedDate === 'latest' && ' (Latest in DB)'}
              </span>
            )}
          </div>
          <h2 className="font-display text-2xl lg:text-3xl font-extrabold text-ink-950 dark:text-mist-100 tracking-tight">
            Front Load (FL) Replacement Analytics
          </h2>
          <p className="text-sm text-ink-500 dark:text-mist-400 mt-1">
            Comprehensive latest date analytics for FL part replacements, TL comparison, and FL machine replacements decoded by capacity &amp; RPM.
          </p>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <FilterBar
            date={selectedDate === 'latest' ? (latestDate || '') : selectedDate}
            onDateChange={handleDateChange}
            dateLabel="Select Date"
          />

          {selectedDate !== 'latest' && (
            <button
              onClick={() => handleDateChange('latest')}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 transition-all cursor-pointer shadow-xs"
              title="Reset to latest date data"
            >
              Latest Date
            </button>
          )}

          <button
            onClick={() => navigate('/part-replacement/showcase')}
            className="px-3 py-2 text-xs font-bold rounded-lg bg-signal/20 hover:bg-signal/30 text-signal-dark dark:text-signal border border-signal/40 transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            title="Launch TV Showcase mode"
          >
            <span>📺</span> Part Showcase
          </button>

          <button
            onClick={() => {
              refetchPartSummary();
              refetchProductRows();
              refetchPartDetails();
            }}
            className="btn-secondary text-xs px-3 py-2"
            title="Refresh analytics data"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>


      {/* Dataset Notice Banner */}
      <div className="rounded-xl bg-linear-to-r from-sky-500/10 via-purple-500/10 to-rose-500/10 border border-sky-500/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-lg shrink-0">
            📊
          </div>
          <div>
            <p className="text-xs lg:text-sm font-semibold text-ink-900 dark:text-mist-100">
              Active Dataset: <span className="text-sky-600 dark:text-sky-400 font-bold">Front Load (FL)</span> uploaded for date{' '}
              <span className="font-mono font-bold bg-white/70 dark:bg-ink-900/80 px-2 py-0.5 rounded border border-mist-300 dark:border-ink-700">
                {activeDate || 'Latest available'}
              </span>
            </p>
            <p className="text-[11px] text-ink-500 dark:text-mist-400 mt-0.5">
              Part replacements for FL are populated from <code className="text-xs">part_replacement</code>. Machine replacements for FL are parsed from <code className="text-xs">product_replacement</code> model codes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            ✓ FL Data Active ({partData?.flCount || 0} Parts)
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            ℹ TL Data: {partData?.tlCount || 0}
          </span>
        </div>
      </div>

      {isLoading && (
        <LoadingSpinner label="Loading latest FL part and machine replacement analytics…" />
      )}

      {(partSummaryError || productError) && (
        <ErrorBanner
          message={partSummaryError || productError}
          onRetry={() => {
            refetchPartSummary();
            refetchProductRows();
          }}
        />
      )}

      {/* ============================================================
          SECTION 1: THE 3 CORE GRAPHS
          ============================================================ */}
      <div className="space-y-6">
        {/* Row 1: Graph 1 (FL Part Replacement) & Graph 2 (TL Part Replacement) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graph 1: Part Replacement of FL */}
          <FLPartReplacementChart
            cards={partData?.cards || []}
            total={partData?.total || 0}
            flCount={partData?.flCount || 0}
            activeDate={activeDate}
          />

          {/* Graph 2: Part Replacement of TL */}
          <TLPartReplacementChart
            cards={partData?.cards || []}
            total={partData?.total || 0}
            tlCount={partData?.tlCount || 0}
            activeDate={activeDate}
          />
        </div>

        {/* Row 2: Graph 3 (Machine Replacement by FL Model Capacity & RPM) */}
        <FLMachineCapacityRPMChart
          rows={productRows}
          activeDate={activeDate}
          loading={productLoading}
        />
      </div>

      {/* ============================================================
          SECTION 2: DRILLDOWN DATA RECORDS TABLE
          ============================================================ */}
      <div className="panel p-4 lg:p-6 shadow-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-mist-200 dark:border-ink-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-bold text-ink-950 dark:text-mist-100">
              Drilldown Records
            </h3>
            <span className="text-xs text-ink-500 dark:text-mist-400">
              ({tableTab === 'parts' ? filteredPartRows.length : filteredProductRows.length} entries for {activeDate || 'selected date'})
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Tabs */}
            <div className="flex items-center bg-mist-100 dark:bg-ink-800 p-1 rounded-lg border border-mist-300 dark:border-ink-700 text-xs">
              <button
                onClick={() => setTableTab('parts')}
                className={`px-3 py-1.5 font-semibold rounded-md transition-all ${
                  tableTab === 'parts'
                    ? 'bg-white dark:bg-ink-900 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-ink-600 dark:text-mist-400 hover:text-ink-900 dark:hover:text-mist-200'
                }`}
              >
                FL Parts Table ({partRows.length})
              </button>
              <button
                onClick={() => setTableTab('machines')}
                className={`px-3 py-1.5 font-semibold rounded-md transition-all ${
                  tableTab === 'machines'
                    ? 'bg-white dark:bg-ink-900 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-ink-600 dark:text-mist-400 hover:text-ink-900 dark:hover:text-mist-200'
                }`}
              >
                FL Machines Table ({productRows.length})
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rows..."
                className="input-field text-xs py-1.5 pl-8 pr-3 w-48 sm:w-56"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mist-400 text-xs">
                🔍
              </span>
            </div>

            {/* Export CSV */}
            <button
              onClick={handleExportCurrentTable}
              className="btn-secondary text-xs px-3 py-1.5"
              title="Download CSV of current table"
            >
              <span>📥</span> Export CSV
            </button>
          </div>
        </div>

        {/* Tab 1: FL Part Replacements Table */}
        {tableTab === 'parts' && (
          <div className="overflow-x-auto">
            {partDetailsLoading ? (
              <div className="py-8 text-center text-xs text-ink-500 dark:text-mist-400">
                Loading FL part replacement records…
              </div>
            ) : filteredPartRows.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink-500 dark:text-mist-400">
                No FL part replacement records found.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-mist-50 dark:bg-ink-950/60 text-ink-600 dark:text-mist-400 border-b border-mist-200 dark:border-ink-800 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-3 py-2.5">Date (DOC)</th>
                    <th className="px-3 py-2.5">Complaint No</th>
                    <th className="px-3 py-2.5">Model</th>
                    <th className="px-3 py-2.5">Item / Part Code</th>
                    <th className="px-3 py-2.5">Part Description</th>
                    <th className="px-3 py-2.5">Branch</th>
                    <th className="px-3 py-2.5 text-center">Ageing Category</th>
                    <th className="px-3 py-2.5">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist-200 dark:divide-ink-800/60">
                  {filteredPartRows.slice(0, 50).map((row, idx) => (
                    <tr
                      key={row.id || idx}
                      className="hover:bg-mist-50/80 dark:hover:bg-ink-800/30 transition-colors"
                    >
                      <td className="px-3 py-2 font-mono whitespace-nowrap text-ink-700 dark:text-mist-300">
                        {formatDate(row.doc || row.spu_created_date)}
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold text-ink-900 dark:text-mist-100">
                        {row.complaint_number || row.ticket_no || '-'}
                      </td>
                      <td className="px-3 py-2 font-medium text-ink-900 dark:text-mist-100">
                        {row.model || '-'}
                      </td>
                      <td className="px-3 py-2 font-mono text-ink-600 dark:text-mist-400">
                        {row.item_code || row.part_code || '-'}
                      </td>
                      <td className="px-3 py-2 text-ink-800 dark:text-mist-200 max-w-xs truncate" title={row.description || row.part_description}>
                        {row.description || row.part_description || '-'}
                      </td>
                      <td className="px-3 py-2 text-ink-700 dark:text-mist-300">
                        {row.branch || '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          {row.ageing_category || '0-3 Months'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-ink-500 dark:text-mist-400 font-mono text-[11px] truncate max-w-[150px]">
                        {row.admin_comment || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {filteredPartRows.length > 50 && (
              <p className="text-center text-xs text-ink-500 dark:text-mist-400 mt-3">
                Showing top 50 of {filteredPartRows.length} records. Export CSV to view all rows.
              </p>
            )}
          </div>
        )}

        {/* Tab 2: FL Machine Replacements Table (with Model Spec Decoded) */}
        {tableTab === 'machines' && (
          <div className="overflow-x-auto">
            {filteredProductRows.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink-500 dark:text-mist-400">
                No FL machine replacement records found for this date.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-mist-50 dark:bg-ink-950/60 text-ink-600 dark:text-mist-400 border-b border-mist-200 dark:border-ink-800 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Complaint No</th>
                    <th className="px-3 py-2.5">Model</th>
                    <th className="px-3 py-2.5">Capacity (Kg)</th>
                    <th className="px-3 py-2.5">Spin Speed (RPM)</th>
                    <th className="px-3 py-2.5">Damage Type</th>
                    <th className="px-3 py-2.5">Branch</th>
                    <th className="px-3 py-2.5">Ageing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist-200 dark:divide-ink-800/60">
                  {filteredProductRows.slice(0, 50).map((row, idx) => {
                    const spec = parseFLModelSpecs(row.model);
                    return (
                      <tr
                        key={row.id || idx}
                        className="hover:bg-mist-50/80 dark:hover:bg-ink-800/30 transition-colors"
                      >
                        <td className="px-3 py-2 font-mono whitespace-nowrap text-ink-700 dark:text-mist-300">
                          {formatDate(row.zmac_date || row.doc)}
                        </td>
                        <td className="px-3 py-2 font-mono font-semibold text-ink-900 dark:text-mist-100">
                          {row.complaint_number || '-'}
                        </td>
                        <td className="px-3 py-2 font-medium text-ink-900 dark:text-mist-100">
                          {row.model || '-'}
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800 text-[11px]">
                            {spec.capacityLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800 text-[11px]">
                            {spec.rpmLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-ink-700 dark:text-mist-300">
                          {row.type_of_damage || 'Functional'}
                        </td>
                        <td className="px-3 py-2 text-ink-700 dark:text-mist-300">
                          {row.branch || '-'}
                        </td>
                        <td className="px-3 py-2 font-mono text-ink-600 dark:text-mist-400">
                          {row.ageing_days !== null && row.ageing_days !== undefined
                            ? `${row.ageing_days}d`
                            : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {filteredProductRows.length > 50 && (
              <p className="text-center text-xs text-ink-500 dark:text-mist-400 mt-3">
                Showing top 50 of {filteredProductRows.length} machine replacement records. Export CSV to view all.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
