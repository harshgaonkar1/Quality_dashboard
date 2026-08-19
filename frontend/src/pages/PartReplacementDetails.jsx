// ============================================================
// Part Replacement Details Page
// ------------------------------------------------------------
// Drill-down table reached from a summary card (or "View all
// records"). Supports search, sorting, pagination, sub-category dropdown,
// CSV export, and Admin Comments editing in Admin Mode.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';
import { fetchDashboardDetails, fetchDetailsForExport, savePartComment } from '../services/partReplacementService';
import { useAdmin } from '../context/AdminContext';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import { formatDate } from '../utils/formatDate';
import { exportToCSV } from '../utils/csvExport';

const PAGE_SIZE = 25;

const CATEGORY_LABELS = {
  'installation-failure': 'Installation Failure',
  '0-3-months': '0-3 Months',
  '1-year': '1 Year',
  '2-year': '2 Year',
  '3-year': '3 Year',
  '4-year': '4 Year',
  'more-than-4-years': 'More than 4 Years',
};

function RemarksCell({ row, isAdmin, openAdminModal }) {
  const [comment, setComment] = useState(row.admin_comment || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setComment(row.admin_comment || '');
  }, [row.admin_comment]);

  const handleSave = async () => {
    if (!isAdmin) {
      openAdminModal();
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      await savePartComment(row.serial_number || row.ticket_no || row.complaint_number, comment);
      row.admin_comment = comment;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save remark:', e);
      setErrorMsg('Failed');
      setTimeout(() => setErrorMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-between gap-2 min-w-[200px] px-2 py-1 rounded bg-mist-100/50 dark:bg-ink-950/40 border border-mist-200/60 dark:border-ink-800">
        <span className="text-xs font-mono text-ink-800 dark:text-mist-200 truncate max-w-[160px]" title={row.admin_comment || 'No remarks recorded'}>
          {row.admin_comment ? row.admin_comment : <span className="text-mist-400 italic text-[11px]">No remarks</span>}
        </span>
        <button
          onClick={openAdminModal}
          title="Login as Admin to edit remarks"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-signal-dark dark:text-signal hover:underline px-1.5 py-0.5 rounded bg-signal/10 dark:bg-signal/20 shrink-0 cursor-pointer"
        >
          🔒 Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 min-w-[240px]">
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter remark (press Enter to save)..."
        className="text-xs px-2.5 py-1.5 rounded border border-green-500/60 bg-black text-green-400 placeholder-green-800 focus:outline-none focus:border-green-400 w-full font-mono transition-all"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className={`px-3 py-1.5 text-xs font-bold rounded shrink-0 transition-all cursor-pointer ${saved
            ? 'bg-green-400 text-black'
            : errorMsg
              ? 'bg-red-500 text-white'
              : 'bg-green-500 hover:bg-green-400 text-black shadow-xs disabled:opacity-50'
          }`}
      >
        {saving ? '...' : saved ? '✓ Saved' : errorMsg ? '⚠️ Error' : 'Save'}
      </button>
    </div>
  );
}

export default function PartReplacementDetails() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, openAdminModal } = useAdmin();

  const ageingCategory = searchParams.get('ageingCategory') || '';
  const subCategory = searchParams.get('subCategory') || searchParams.get('productCategory') || '';
  const date = searchParams.get('date') || '';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('doc');
  const [sortDir, setSortDir] = useState('DESC');
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  // Reset to page 1 whenever filter scope or search changes
  useEffect(() => {
    setPage(1);
  }, [ageingCategory, subCategory, date, debouncedSearch]);

  const fetchFn = useCallback(
    () =>
      fetchDashboardDetails({
        ageingCategory: ageingCategory || undefined,
        subCategory: subCategory || undefined,
        date: date || undefined,
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        sortBy,
        sortDir,
      }),
    [ageingCategory, subCategory, date, page, debouncedSearch, sortBy, sortDir]
  );

  const { data, loading, error, refetch } = useFetch(fetchFn, [fetchFn]);

  const columns = [
    { key: 'branch', label: 'Branch', sortable: true },
    { key: 'franchise', label: 'Franchise', sortable: true, render: (row) => row.franchise || row.franchisee_name || '-' },
    { key: 'spu_status', label: 'SPU Status', sortable: true },
    { key: 'doc', label: 'DOC (SPU Created Date)', sortable: true, render: (row) => formatDate(row.spu_created_date || row.doc) },
    { key: 'doi', label: 'DOI', sortable: true, render: (row) => formatDate(row.doi) },
    { key: 'ticket_no', label: 'Ticket', sortable: true },
    { key: 'machine_status', label: 'Machine Status', sortable: true },
    { key: 'model', label: 'Model Name', sortable: true },
    { key: 'serial_number', label: 'Serial Number', sortable: true },
    { key: 'item_code', label: 'Item Code', sortable: true, render: (row) => row.item_code || row.part_code || '-' },
    { key: 'description', label: 'Description', sortable: true, render: (row) => row.description || row.part_description || '-' },
    { key: 'approved_qty', label: 'Approved Qty', sortable: true, render: (row) => row.approved_qty ?? 1 },
    { key: 'rej_qty', label: 'Rej Qty', sortable: true, render: (row) => row.rej_qty ?? 0 },
    { key: 'sub_category', label: 'Sub Category', sortable: true, render: (row) => row.sub_category || 'N/A' },
    { key: 'ageing_days', label: 'Ageing Days', sortable: true },
    {
      key: 'ageing_category',
      label: 'Ageing Category',
      sortable: true,
      render: (row) => {
        const days = row.ageing_days;
        if (days === 0 || days === '0') return 'Installation Failure';
        if (days !== null && days !== undefined && !isNaN(days) && Number(days) > 0 && Number(days) <= 90) return '0-3 Months';
        return row.ageing_category || '0-3 Months';
      }
    },
    { key: 'admin_comment', label: 'Remarks', sortable: false, render: (row) => <RemarksCell row={row} isAdmin={isAdmin} openAdminModal={openAdminModal} /> },
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
        subCategory: subCategory || undefined,
        date: date || undefined,
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
          { key: 'admin_comment', label: 'Remarks' },
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
        date={date}
        onDateChange={handleDateChange}
        dateLabel="SPU Created Date"
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
