// ============================================================
// Product Replacement Showcase Page
// ------------------------------------------------------------
// Showcase/Presentation page mode for Product Replacement.
// Automatically rotates between the TL vs FL Pie Chart view
// and the Product Replacement Data Table view every 15 seconds.
// Fits into a single frame screen view (no scrolling).
// Highcharts pie chart animates ONCE on load, staying mounted.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';
import { fetchDashboardDetails, fetchDashboardSummary } from '../services/productReplacementService';
import TLFLPieChart from '../components/TLFLPieChart';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import { formatDate } from '../utils/formatDate';
import { useAdmin } from '../context/AdminContext';

const ROTATION_INTERVAL_SEC = 15;
const PAGE_SIZE = 8; // Fits perfectly into single frame screen view

export default function ProductReplacementShowcase() {
  const { isAdmin } = useAdmin();

  // Slide state: 'pie' | 'table'
  const [activeSlide, setActiveSlide] = useState('pie');
  const [autoPlay, setAutoPlay] = useState(true);
  const [timeLeft, setTimeLeft] = useState(ROTATION_INTERVAL_SEC);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filters state (defaults to 'latest' to display latest date data for that day only)
  const [typeOfDamage, setTypeOfDamage] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [date, setDate] = useState('latest');

  // Table state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('doc');
  const [sortDir, setSortDir] = useState('DESC');
  const debouncedSearch = useDebounce(search, 400);

  const containerRef = useRef(null);

  // 1. Fetch Summary Data (for Pie Chart)
  const summaryFetchFn = useCallback(
    () => fetchDashboardSummary({ typeOfDamage, productCategory, date }),
    [typeOfDamage, productCategory, date]
  );
  const {
    data: summaryData,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useFetch(summaryFetchFn, [summaryFetchFn]);

  // 2. Fetch Details Data (for Data Table)
  const detailsFetchFn = useCallback(
    () =>
      fetchDashboardDetails({
        typeOfDamage: typeOfDamage || undefined,
        productCategory: productCategory || undefined,
        date: date || undefined,
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        sortBy,
        sortDir,
      }),
    [typeOfDamage, productCategory, date, page, debouncedSearch, sortBy, sortDir]
  );
  const {
    data: detailsData,
    loading: detailsLoading,
    error: detailsError,
    refetch: refetchDetails,
  } = useFetch(detailsFetchFn, [detailsFetchFn]);

  // Handle 15-second auto-rotation countdown timer
  useEffect(() => {
    if (!autoPlay) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Switch slide automatically
          setActiveSlide((curr) => (curr === 'pie' ? 'table' : 'pie'));
          return ROTATION_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoPlay]);

  // Switch manual slide handler
  function handleSelectSlide(slide) {
    setActiveSlide(slide);
    setTimeLeft(ROTATION_INTERVAL_SEC); // Reset timer on manual action
  }

  // Toggle Auto-Play
  function toggleAutoPlay() {
    setAutoPlay((prev) => !prev);
    setTimeLeft(ROTATION_INTERVAL_SEC);
  }

  // Fullscreen mode handler
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.error('Error entering fullscreen:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => {
        console.error('Error exiting fullscreen:', err);
      });
      setIsFullscreen(false);
    }
  }

  useEffect(() => {
    function handleFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Table columns configuration
  const columns = [
    { key: 'complaint_number', label: 'ZMAC ID', sortable: true },
    { key: 'zmac_date', label: 'ZMAC Date', sortable: true, render: (row) => formatDate(row.zmac_date || row.doc) },
    { key: 'fd_zbrn_status', label: 'Status', sortable: true },
    { key: 'branch', label: 'Branch', sortable: true },
    { key: 'ticket_no', label: 'Ticket No', sortable: true },
    { key: 'machine_status', label: 'Machine Status', sortable: true },
    { key: 'model', label: 'Product Description', sortable: true },
    { key: 'serial_number', label: 'Serial Number', sortable: true },
    { key: 'type_of_damage', label: 'Damage Type', sortable: true },
    { key: 'ageing_days', label: 'Ageing Days', sortable: true },
    { key: 'ageing_category', label: 'Ageing Category', sortable: true },
  ];

  function handleSort(columnKey) {
    if (sortBy === columnKey) {
      setSortDir((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(columnKey);
      setSortDir('DESC');
    }
  }

  const progressPercent = ((ROTATION_INTERVAL_SEC - timeLeft) / ROTATION_INTERVAL_SEC) * 100;

  return (
    <div
      ref={containerRef}
      className={`space-y-2.5 max-w-7xl mx-auto flex flex-col justify-between ${isFullscreen
        ? 'p-4 bg-mist-100 dark:bg-ink-950 h-screen overflow-hidden'
        : 'w-full'
        }`}
    >
      {/* Header + Filter controls combined into compact single-frame top section */}
      <div className="space-y-3 shrink-0">
        {/* Top Controls Header */}
        <div className={`p-3.5 lg:p-4 rounded-xl border transition-all ${isAdmin
          ? 'bg-neutral-950 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
          : 'bg-white dark:bg-ink-900 border-mist-300 dark:border-ink-800 shadow-xs'
          }`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-signal/20 text-signal-dark dark:text-signal border border-signal/30 uppercase tracking-wider animate-pulse">
                📺 Showcase Mode
              </span>
              <h2 className="font-display text-base lg:text-lg font-bold text-ink-950 dark:text-white">
                Product Replacement Showcase
              </h2>
            </div>

            {/* Action Bar & Mode Switcher */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* View Switcher Tabs */}
              <div className="inline-flex p-0.5 rounded-lg bg-mist-200/80 dark:bg-ink-950 border border-mist-300 dark:border-ink-800">
                <button
                  onClick={() => handleSelectSlide('pie')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${activeSlide === 'pie'
                    ? 'bg-white dark:bg-ink-800 text-ink-950 dark:text-white shadow-xs'
                    : 'text-ink-600 dark:text-mist-400 hover:text-ink-950 dark:hover:text-white'
                    }`}
                >
                  🥧 Pie Chart View
                </button>
                <button
                  onClick={() => handleSelectSlide('table')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${activeSlide === 'table'
                    ? 'bg-white dark:bg-ink-800 text-ink-950 dark:text-white shadow-xs'
                    : 'text-ink-600 dark:text-mist-400 hover:text-ink-950 dark:hover:text-white'
                    }`}
                >
                  📋 Data Table View
                </button>
              </div>

              {/* Play / Pause Rotation Toggle */}
              <button
                onClick={toggleAutoPlay}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${autoPlay
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                  : 'border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20'
                  }`}
                title={autoPlay ? 'Pause 15s slideshow auto-rotation' : 'Resume 15s slideshow auto-rotation'}
              >
                {autoPlay ? '⏸ Pause' : '▶ Play'}
              </button>

              {/* Next View Button */}
              <button
                onClick={() => handleSelectSlide(activeSlide === 'pie' ? 'table' : 'pie')}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-mist-300 dark:border-ink-700 bg-mist-100 dark:bg-ink-800 text-ink-800 dark:text-mist-200 hover:bg-mist-200 dark:hover:bg-ink-700 transition-all cursor-pointer"
                title="Switch to next slide immediately"
              >
                Next ➔
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-mist-300 dark:border-ink-700 bg-mist-100 dark:bg-ink-800 text-ink-800 dark:text-mist-200 hover:bg-mist-200 dark:hover:bg-ink-700 transition-all cursor-pointer"
                title="Toggle full screen mode"
              >
                {isFullscreen ? '↙ Exit' : '⛶ Fullscreen'}
              </button>
            </div>
          </div>

          {/* Animated 15s Timer Countdown Bar */}
          <div className="mt-2.5 pt-2 border-t border-mist-200 dark:border-ink-800/60">
            <div className="flex items-center justify-between text-[11px] font-medium text-ink-500 dark:text-mist-400 mb-1">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${autoPlay ? 'bg-green-500 animate-ping' : 'bg-amber-500'}`} />
                Current View: <strong className="text-ink-900 dark:text-white uppercase">{activeSlide === 'pie' ? 'Pie Chart' : 'Data Table'}</strong>
              </span>
              <span>
                {autoPlay ? `Auto-switching in ${timeLeft}s (15s rotation)` : 'Paused'}
              </span>
            </div>

            <div className="w-full h-1.5 rounded-full overflow-hidden bg-mist-200 dark:bg-ink-800">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${autoPlay ? 'bg-signal' : 'bg-amber-500'
                  }`}
                style={{ width: `${autoPlay ? progressPercent : 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filter Bar for Showcase Data */}
        <FilterBar
          search={activeSlide === 'table' ? search : ''}
          onSearchChange={activeSlide === 'table' ? setSearch : undefined}
          date={date === 'latest' ? (summaryData?.data?.activeDate || summaryData?.data?.latestDate || '') : date}
          onDateChange={(val) => setDate(val || 'latest')}
          dateLabel="ZMAC Date"
          typeOfDamage={typeOfDamage}
          onDamageTypeChange={setTypeOfDamage}
          productCategory={productCategory}
          onProductCategoryChange={setProductCategory}
        />
      </div>

      {/* Main Slide Area: Both kept mounted in DOM to PREVENT re-animation on slide switch */}
      <div className="flex-1 min-h-0 flex flex-col justify-center my-auto">
        {/* Slide 1: Pie Chart (Always mounted, hidden when activeSlide !== 'pie') */}
        <div className={activeSlide === 'pie' ? 'block' : 'hidden'}>
          {summaryLoading && !summaryData && <LoadingSpinner label="Loading Pie Chart Data..." />}
          {summaryError && <ErrorBanner message={summaryError} onRetry={refetchSummary} />}
          {summaryData && (
            <TLFLPieChart
              total={summaryData.data.total}
              tlCount={summaryData.data.tlCount}
              flCount={summaryData.data.flCount}
              cards={summaryData.data.cards}
              activeDate={summaryData.data.activeDate || summaryData.data.latestDate}
            />
          )}
        </div>

        {/* Slide 2: Data Table (Always mounted, hidden when activeSlide !== 'table') */}
        <div className={activeSlide === 'table' ? 'block space-y-2' : 'hidden'}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink-950 dark:text-white flex items-center gap-1.5">
              <span>📋</span> Product Replacement Records Table
            </h3>
            {detailsData && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-mist-200 dark:bg-ink-800 text-ink-700 dark:text-mist-300">
                Total Records: {detailsData.data.total.toLocaleString()}
              </span>
            )}
          </div>

          {detailsLoading && !detailsData && <LoadingSpinner label="Loading Table Records..." />}
          {detailsError && <ErrorBanner message={detailsError} onRetry={refetchDetails} />}

          {detailsData && (
            <DataTable
              columns={columns}
              rows={detailsData.data.rows}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              page={detailsData.data.page}
              pageSize={detailsData.data.pageSize}
              total={detailsData.data.total}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
