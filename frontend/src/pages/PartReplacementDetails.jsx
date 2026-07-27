// ============================================================
// Part Replacement Details Page
// ------------------------------------------------------------
// Drill-down table reached from a summary card (or "View all
// records"). Supports search, sorting, pagination, sub-category dropdown,
// and CSV export.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';
import { fetchDashboardDetails, fetchDetailsForExport } from '../services/partReplacementService';
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
  { key: 'branch', label: 'Branch', sortable: true },
  { key: 'spu_status', label: 'SPU Status', sortable: true },
  { key: 'doc', label: 'SPU Created Date (doc)', sortable: true, render: (row) => formatDate(row.spu_created_date || row.doc) },
  { key: 'doi', label: 'doi', sortable: true, render: (row) => formatDate(row.doi) },
  { key: 'dop', label: 'dop', sortable: true, render: (row) => formatDate(row.dop) },
  { key: 'ticket_no', label: 'Ticket', sortable: true },
  { key: 'machine_status', label: 'Machine Status', sortable: true },
  { key: 'model', label: 'Model Name', sortable: true },
  { key: 'serial_number', label: 'Serial Number', sortable: true },
  { key: 'item_code', label: 'Item Code', sortable: true, render: (row) => row.item_code || row.part_code || '-' },
  { key: 'description', label: 'Description', sortable: true, render: (row) => row.description || row.part_description || '-' },
  { key: 'problem_description', label: 'Problem Description', sortable: true, render: (row) => row.problem_description || row.customer_complaint || '-' },
  { key: 'sub_category', label: 'Sub Category', sortable: true, render: (row) => row.sub_category || 'N/A' },
  { key: 'ageing_days', label: 'Ageing Days', sortable: true },
  { key: 'ageing_category', label: 'Ageing Category', sortable: true },
];

export default function PartReplacementDetails() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const ageingCategory = searchParams.get('ageingCategory') || '';
  const subCategory = searchParams.get('subCategory') || searchParams.get('productCategory') || '';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('doc');
  const [sortDir, setSortDir] = useState('DESC');
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  // Reset to page 1 whenever filter scope or search changes
  useEffect(() => {
    setPage(1);
  }, [ageingCategory, subCategory, debouncedSearch]);

  const fetchFn = useCallback(
    () =>
      fetchDashboardDetails({
        ageingCategory: ageingCategory || undefined,
        subCategory: subCategory || undefined,
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        sortBy,
        sortDir,
      }),
    [ageingCategory, subCategory, page, debouncedSearch, sortBy, sortDir]
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

  function handleAgeingCategoryChange(val) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) next.set('ageingCategory', val);
      else next.delete('ageingCategory');
      return next;
    });
  }

  function handleClearCategory() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('ageingCategory');
      return next;
    });
  }

  function handleSubCategoryChange(val) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) {
        next.set('subCategory', val);
        next.delete('productCategory');
      } else {
        next.delete('subCategory');
        next.delete('productCategory');
      }
      return next;
    });
  }

  async function handleExport() {
    try {
      setExporting(true);
      const result = await fetchDetailsForExport({
        ageingCategory: ageingCategory || undefined,
        subCategory: subCategory || undefined,
        search: debouncedSearch,
      });
      exportToCSV(
        result.data.rows,
        [
          { key: 'branch', label: 'Branch' },
          { key: 'spu_status', label: 'SPU Status' },
          { key: 'doc', label: 'SPU Created Date (doc)' },
          { key: 'doi', label: 'doi' },
          { key: 'dop', label: 'dop' },
          { key: 'ticket_no', label: 'Ticket' },
          { key: 'machine_status', label: 'Machine Status' },
          { key: 'model', label: 'Model Name' },
          { key: 'serial_number', label: 'Serial Number' },
          { key: 'item_code', label: 'Item Code' },
          { key: 'description', label: 'Description' },
          { key: 'problem_description', label: 'Problem Description' },
          { key: 'sub_category', label: 'Sub Category' },
          { key: 'ageing_days', label: 'Ageing Days' },
          { key: 'ageing_category', label: 'Ageing Category' },
        ],
        `part-replacement-${subCategory || 'all'}-${ageingCategory || 'all'}-${Date.now()}.csv`
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
          onClick={() => navigate('/part-replacement')}
          className="text-ink-500 hover:text-ink-900 transition-colors"
          aria-label="Back to Part Replacement"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
            <path d="M12.5 4.5 6 10l6.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <h2 className="font-display text-xl font-bold text-ink-950">Part Replacement Details</h2>
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        productCategory={subCategory}
        onProductCategoryChange={handleSubCategoryChange}
        ageingCategory={ageingCategory}
        onAgeingCategoryChange={handleAgeingCategoryChange}
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
