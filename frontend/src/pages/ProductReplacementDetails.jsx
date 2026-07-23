// ============================================================
// Product Replacement Details Page
// ------------------------------------------------------------
// Drill-down table reached from a summary card (or "View all
// records"). Supports search, sorting, pagination, and CSV export.
// Reads the optional ?ageingCategory= query param to scope results.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';
import { fetchDashboardDetails, fetchDetailsForExport } from '../services/productReplacementService';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import { formatDate } from '../utils/formatDate';
import { exportToCSV } from '../utils/csvExport';

const PAGE_SIZE = 25;

const CATEGORY_LABELS = {
  '0-3-months': '0-3 Months',
  '1-year': '1 Year',
  '2-year': '2 Year',
  '3-year': '3 Year',
  '4-year': '4 Year',
  'more-than-4-years': 'More than 4 Years',
};

const COLUMNS = [
  { key: 'complaint_number', label: 'Complaint No.', sortable: true },
  { key: 'model', label: 'Model', sortable: true },
  { key: 'branch', label: 'Branch', sortable: true },
  { key: 'mat_cat', label: 'Mat Cat', sortable: true },
  { key: 'machine_status', label: 'Machine Status', sortable: true },
  { key: 'serial_number', label: 'Serial No.', sortable: true },
  { key: 'doi', label: 'DOI', sortable: true, render: (row) => formatDate(row.doi) },
  { key: 'doc', label: 'DOC', sortable: true, render: (row) => formatDate(row.doc) },
  {
    key: 'ageing_days',
    label: 'Ageing',
    sortable: true,
    render: (row) => (
      <span className="inline-flex items-center gap-1.5">
        <span className="font-semibold tabular-nums">{row.ageing_days}d</span>
        <span className="text-xs text-ink-400">· {row.ageing_category}</span>
      </span>
    ),
  },
  { key: 'fd_zbrn_status', label: 'FD ZBRN Status', sortable: false },
  { key: 'type_of_damage', label: 'Type of Damage', sortable: false },
];

export default function ProductReplacementDetails() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const ageingCategory = searchParams.get('ageingCategory') || '';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('doc');
  const [sortDir, setSortDir] = useState('DESC');
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  // Reset to page 1 whenever the filter scope or search term changes
  useEffect(() => {
    setPage(1);
  }, [ageingCategory, debouncedSearch]);

  const fetchFn = useCallback(
    () =>
      fetchDashboardDetails({
        ageingCategory: ageingCategory || undefined,
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        sortBy,
        sortDir,
      }),
    [ageingCategory, page, debouncedSearch, sortBy, sortDir]
  );

  const { data, loading, error, refetch } = useFetch(fetchFn, [fetchFn]);

  function handleSort(columnKey) {
    if (sortBy === columnKey) {
      setSortDir((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(columnKey);
      setSortDir('DESC');
    }
  }

  function handleClearCategory() {
    setSearchParams({});
  }

  async function handleExport() {
    try {
      setExporting(true);
      const result = await fetchDetailsForExport({
        ageingCategory: ageingCategory || undefined,
        search: debouncedSearch,
      });
      exportToCSV(
        result.data.rows,
        [
          { key: 'complaint_number', label: 'Complaint Number' },
          { key: 'model', label: 'Model' },
          { key: 'branch', label: 'Branch' },
          { key: 'mat_cat', label: 'Mat Cat' },
          { key: 'machine_status', label: 'Machine Status' },
          { key: 'serial_number', label: 'Serial Number' },
          { key: 'doi', label: 'DOI' },
          { key: 'doc', label: 'DOC' },
          { key: 'ageing_days', label: 'Ageing (Days)' },
          { key: 'ageing_category', label: 'Ageing Category' },
          { key: 'fd_zbrn_status', label: 'FD ZBRN Status' },
          { key: 'type_of_damage', label: 'Type of Damage' },
        ],
        `product-replacement-${ageingCategory || 'all'}-${Date.now()}.csv`
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Export failed:', err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/product-replacement')}
          className="text-ink-500 hover:text-ink-900 transition-colors"
          aria-label="Back to Product Replacement"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
            <path d="M12.5 4.5 6 10l6.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <h2 className="font-display text-xl font-bold text-ink-950">Product Replacement Details</h2>
          <p className="text-sm text-ink-500">Live data from MySQL, filtered to approved functional-damage cases</p>
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        activeCategoryLabel={CATEGORY_LABELS[ageingCategory]}
        onClearCategory={handleClearCategory}
        onExport={handleExport}
        exporting={exporting}
      />

      {loading && !data && <LoadingSpinner label="Loading records…" />}
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {data && (
        <DataTable
          columns={COLUMNS}
          rows={data.data.rows}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          page={data.data.page}
          pageSize={data.data.pageSize}
          total={data.data.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
