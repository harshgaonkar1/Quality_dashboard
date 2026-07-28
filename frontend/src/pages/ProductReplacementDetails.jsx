// ============================================================
// Product Replacement Details Page
// ------------------------------------------------------------
// Drill-down table reached from a summary card (or "View all
// records"). Supports search, sorting, pagination, CSV export,
// and Admin Comments editing in Admin Mode.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';
import { fetchDashboardDetails, fetchDetailsForExport, saveProductComment } from '../services/productReplacementService';
import { useAdmin } from '../context/AdminContext';
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

function AdminCommentCell({ row, isAdmin, openAdminModal }) {
  const [comment, setComment] = useState(row.admin_comment || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setComment(row.admin_comment || '');
  }, [row.admin_comment]);

  const handleSave = async () => {
    if (!isAdmin) {
      openAdminModal();
      return;
    }
    setSaving(true);
    try {
      await saveProductComment(row.serial_number || row.complaint_number, comment);
      row.admin_comment = comment;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save comment:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 min-w-[220px]">
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onFocus={() => {
          if (!isAdmin) openAdminModal();
        }}
        placeholder={isAdmin ? 'Add comment...' : 'Click to login & comment'}
        className={`text-xs px-2.5 py-1.5 rounded border ${
          isAdmin
            ? 'border-green-500/50 bg-black text-green-400 placeholder-green-800 focus:outline-none focus:border-green-400'
            : 'border-mist-300 bg-white text-ink-900 placeholder:text-mist-400'
        } w-full font-mono transition-all`}
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className={`px-3 py-1.5 text-xs font-bold rounded shrink-0 transition-all ${
          isAdmin
            ? 'bg-green-500 hover:bg-green-400 text-black shadow-xs'
            : 'bg-ink-900 hover:bg-ink-800 text-white shadow-xs'
        } disabled:opacity-50`}
      >
        {saving ? '...' : saved ? '✓ Saved' : 'Save'}
      </button>
    </div>
  );
}

export default function ProductReplacementDetails() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, openAdminModal } = useAdmin();

  const ageingCategory = searchParams.get('ageingCategory') || '';
  const typeOfDamage = searchParams.get('typeOfDamage') || '';
  const productCategory = searchParams.get('productCategory') || '';
  const date = searchParams.get('date') || '';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('doc');
  const [sortDir, setSortDir] = useState('DESC');
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  // Reset to page 1 whenever the filter scope or search term changes
  useEffect(() => {
    setPage(1);
  }, [ageingCategory, typeOfDamage, productCategory, date, debouncedSearch]);

  const fetchFn = useCallback(
    () =>
      fetchDashboardDetails({
        ageingCategory: ageingCategory || undefined,
        typeOfDamage: typeOfDamage || undefined,
        productCategory: productCategory || undefined,
        date: date || undefined,
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        sortBy,
        sortDir,
      }),
    [ageingCategory, typeOfDamage, productCategory, date, page, debouncedSearch, sortBy, sortDir]
  );

  const { data, loading, error, refetch } = useFetch(fetchFn, [fetchFn]);

  const columns = [
    { key: 'complaint_number', label: 'ZMAC ID', sortable: true },
    { key: 'zmac_date', label: 'ZMAC Date', sortable: true, render: (row) => formatDate(row.zmac_date || row.doc) },
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
    { key: 'ageing_days', label: 'ageing days', sortable: true },
    { key: 'ageing_category', label: 'ageing category', sortable: true },
    ...(isAdmin ? [{ key: 'admin_comment', label: 'Admin Comments', sortable: false, render: (row) => <AdminCommentCell row={row} isAdmin={isAdmin} openAdminModal={openAdminModal} /> }] : []),
  ];

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

  function handleDamageTypeChange(val) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) next.set('typeOfDamage', val);
      else next.delete('typeOfDamage');
      return next;
    });
  }

  function handleProductCategoryChange(val) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) next.set('productCategory', val);
      else next.delete('productCategory');
      return next;
    });
  }

  function handleDateChange(val) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) next.set('date', val);
      else next.delete('date');
      return next;
    });
  }

  async function handleExport() {
    try {
      setExporting(true);
      const result = await fetchDetailsForExport({
        ageingCategory: ageingCategory || undefined,
        typeOfDamage: typeOfDamage || undefined,
        productCategory: productCategory || undefined,
        date: date || undefined,
        search: debouncedSearch,
      });
      exportToCSV(
        result.data.rows,
        [
          { key: 'complaint_number', label: 'ZMAC ID' },
          { key: 'zmac_date', label: 'ZMAC Date' },
          { key: 'fd_zbrn_status', label: 'fd zbrn status' },
          { key: 'branch', label: 'branch name' },
          { key: 'ticket_no', label: 'ticket no' },
          { key: 'machine_status', label: 'machine status' },
          { key: 'doc', label: 'doc' },
          { key: 'dop', label: 'dop' },
          { key: 'doi', label: 'doi' },
          { key: 'model', label: 'product description' },
          { key: 'serial_number', label: 'serial number' },
          { key: 'part_code', label: 'spare' },
          { key: 'part_description', label: 'spare desc' },
          { key: 'type_of_damage', label: 'type of damage' },
          { key: 'survey_origin', label: 'survey origin' },
          { key: 'customer_complaint', label: 'customer complaint' },
          { key: 'ageing_days', label: 'ageing days' },
          { key: 'ageing_category', label: 'ageing category' },
          { key: 'admin_comment', label: 'Admin Comments' },
        ],
        `product-replacement-${typeOfDamage || 'all'}-${productCategory || 'all'}-${ageingCategory || 'all'}-${Date.now()}.csv`
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
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        date={date}
        onDateChange={handleDateChange}
        dateLabel="ZMAC Date"
        typeOfDamage={typeOfDamage}
        onDamageTypeChange={handleDamageTypeChange}
        productCategory={productCategory}
        onProductCategoryChange={handleProductCategoryChange}
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
          columns={columns}
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
