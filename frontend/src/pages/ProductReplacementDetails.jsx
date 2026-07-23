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
  { key: 'complaint_number', label: 'ZMAC ID', sortable: true },
  { key: 'fd_zbrn_status', label: 'fd zbrn status', sortable: true },
  { key: 'branch', label: 'branch name', sortable: true },
  { key: 'ticket_no', label: 'ticket no', sortable: true },
  { key: 'machine_status', label: 'machine status', sortable: true },
  { key: 'doc', label: 'doc', sortable: true, render: (row) => formatDate(row.doc) },
  { key: 'dop', label: 'dop', sortable: true, render: (row) => formatDate(row.dop) },
  { key: 'doi', label: 'doi', sortable: true, render: (row) => formatDate(row.doi) },
  { key: 'model', label: 'product description', sortable: true },
  { key: 'serial_number', label: 'serial number', sortable: true },
  { key: 'part_code', label: 'spare', sortable: true },
  { key: 'part_description', label: 'spare desc', sortable: true },
  { key: 'type_of_damage', label: 'type of damage', sortable: true },
  { key: 'survey_origin', label: 'survey origin', sortable: true },
  { key: 'customer_complaint', label: 'customer complaint', sortable: true },
];

export default function ProductReplacementDetails() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const ageingCategory = searchParams.get('ageingCategory') || '';
  const typeOfDamage = searchParams.get('typeOfDamage') || '';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('doc');
  const [sortDir, setSortDir] = useState('DESC');
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  // Reset to page 1 whenever the filter scope or search term changes
  useEffect(() => {
    setPage(1);
  }, [ageingCategory, typeOfDamage, debouncedSearch]);

  const fetchFn = useCallback(
    () =>
      fetchDashboardDetails({
        ageingCategory: ageingCategory || undefined,
        typeOfDamage: typeOfDamage || undefined,
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        sortBy,
        sortDir,
      }),
    [ageingCategory, typeOfDamage, page, debouncedSearch, sortBy, sortDir]
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
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('ageingCategory');
      return next;
    });
  }

  function handleDamageTypeChange(val) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) {
        next.set('typeOfDamage', val);
      } else {
        next.delete('typeOfDamage');
      }
      return next;
    });
  }

  async function handleExport() {
    try {
      setExporting(true);
      const result = await fetchDetailsForExport({
        ageingCategory: ageingCategory || undefined,
        typeOfDamage: typeOfDamage || undefined,
        search: debouncedSearch,
      });
      exportToCSV(
        result.data.rows,
        [
          { key: 'complaint_number', label: 'ZMAC ID' },
          { key: 'fd_zbrn_status', label: 'fd zbrn status' },
          { key: 'branch', label: 'branch name' },
          { key: 'doc', label: 'doc' },
          { key: 'ticket_no', label: 'ticket no' },
          { key: 'machine_status', label: 'machine status' },
          { key: 'dop', label: 'dop' },
          { key: 'doi', label: 'doi' },
          { key: 'model', label: 'product description' },
          { key: 'serial_number', label: 'serial number' },
          { key: 'survey_origin', label: 'survey origin' },
          { key: 'part_code', label: 'spare' },
          { key: 'part_description', label: 'spare desc' },
          { key: 'type_of_damage', label: 'type of damage' },
          { key: 'customer_complaint', label: 'customer complaint' },
        ],
        `product-replacement-${typeOfDamage || 'all'}-${ageingCategory || 'all'}-${Date.now()}.csv`
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
          <p className="text-sm text-ink-500">Live data from MySQL for approved product replacement cases</p>
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        typeOfDamage={typeOfDamage}
        onDamageTypeChange={handleDamageTypeChange}
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
