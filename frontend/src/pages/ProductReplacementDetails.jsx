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
import ActionPlanModal from '../components/ActionPlanModal';
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
      await saveProductComment(row.serial_number || row.complaint_number, comment);
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
        className={`px-3 py-1.5 text-xs font-bold rounded shrink-0 transition-all cursor-pointer ${
          saved
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

  const [actionPlanRow, setActionPlanRow] = useState(null);
  const [isActionPlanOpen, setIsActionPlanOpen] = useState(false);

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

  const handleOpenActionPlan = (row) => {
    setActionPlanRow(row);
    setIsActionPlanOpen(true);
  };

  const handleSaveActionPlanSuccess = () => {
    refetch();
  };

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
    {
      key: 'ageing_category',
      label: 'ageing category',
      sortable: true,
      render: (row) => {
        const days = row.ageing_days;
        if (days === 0 || days === '0') return 'Installation Failure';
        if (days !== null && days !== undefined && !isNaN(days) && Number(days) > 0 && Number(days) <= 90) return '0-3 Months';
        return row.ageing_category || '0-3 Months';
      }
    },
    { key: 'admin_comment', label: 'Remarks', sortable: false, render: (row) => <RemarksCell row={row} isAdmin={isAdmin} openAdminModal={openAdminModal} /> },
    {
      key: 'action_plan',
      label: 'Action Plan',
      sortable: false,
      render: (row) => {
        const hasPlan = Boolean(row.action_done || row.responsible_person || row.initiator_name);
        return (
          <button
            onClick={() => handleOpenActionPlan(row)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs ${
              hasPlan
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100'
                : 'bg-white text-ink-800 dark:bg-ink-900 dark:text-mist-200 border-mist-300 dark:border-ink-700 hover:bg-mist-100 dark:hover:bg-ink-800'
            }`}
            title={
              hasPlan
                ? `Action: ${row.action_done || 'N/A'}\nResponsible: ${row.responsible_person || 'N/A'}\nInitiator: ${row.initiator_name || 'N/A'}`
                : 'Click to open Action Plan modal'
            }
          >
            <span>📋</span>
            <span>{hasPlan ? 'View Plan' : 'Action Plan'}</span>
            {hasPlan && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
          </button>
        );
      },
    },
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
          { key: 'admin_comment', label: 'Remarks' },
          { key: 'action_done', label: 'Action Done' },
          { key: 'responsible_person', label: 'Responsible Person' },
          { key: 'initiator_name', label: 'Initiator Name' },
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

      <ActionPlanModal
        isOpen={isActionPlanOpen}
        onClose={() => setIsActionPlanOpen(false)}
        row={actionPlanRow}
        onSaveSuccess={handleSaveActionPlanSuccess}
        isAdmin={isAdmin}
        openAdminModal={openAdminModal}
      />
    </div>
  );
}
