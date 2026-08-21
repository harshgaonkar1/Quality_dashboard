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
import { useTVRemote } from '../hooks/useTVRemote';
import { fetchDashboardDetails, fetchDashboardSummary } from '../services/productReplacementService';
import TLFLPieChart from '../components/TLFLPieChart';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import { formatDate } from '../utils/formatDate';
import { useAdmin } from '../context/AdminContext';

const ROTATION_INTERVAL_SEC = 30;
const PAGE_SIZE = 7; // Fits perfectly into single frame 32-inch TV screen view without vertical scroll

export default function ProductReplacementShowcase() {
  const { isAdmin } = useAdmin();

  // Slide state: 'pie' | 'table'
  const [activeSlide, setActiveSlide] = useState('pie');
  const [autoPlay, setAutoPlay] = useState(true);
  const [timeLeft, setTimeLeft] = useState(ROTATION_INTERVAL_SEC);
  const [isFullscreen, setIsFullscreen] = useState(true);

  // Filters state (defaults to 'latest' to display latest date data for that day only, typeOfDamage defaults to 'Functional')
  const [typeOfDamage, setTypeOfDamage] = useState('Functional');
  const [productCategory, setProductCategory] = useState('');
  const [date, setDate] = useState('latest');

  // Table state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('doc');
  const [sortDir, setSortDir] = useState('DESC');
  const debouncedSearch = useDebounce(search, 400);

  const containerRef = useRef(null);

  // Auto-enter fullscreen mode when page opens / mounts
  useEffect(() => {
    const tryFullscreen = () => {
      if (containerRef.current && !document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {
          // Native browser fullscreen requires user gesture in some browsers; fixed overlay CSS handles full screen visually until user interacts
        });
      }
    };

    // Attempt immediately on mount
    tryFullscreen();

    // Trigger on first user click or keypress anywhere on screen
    const handleFirstInteraction = () => {
      tryFullscreen();
    };

    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // 1. Fetch Summary Data (for Pie Chart)
  const summaryFetchFn = useCallback(
    () => fetchDashboardSummary({ typeOfDamage: typeOfDamage || 'Functional', productCategory, date }),
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
        typeOfDamage: typeOfDamage || 'Functional',
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
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.error('Error exiting fullscreen:', err);
      });
      setIsFullscreen(false);
    } else if (isFullscreen) {
      setIsFullscreen(false);
    } else {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.error('Error entering fullscreen:', err);
      });
      setIsFullscreen(true);
    }
  }

  useEffect(() => {
    function handleFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // TV Remote key handlers & shortcuts
  const handleToggleSlide = useCallback(() => {
    setActiveSlide((curr) => (curr === 'pie' ? 'table' : 'pie'));
    setTimeLeft(ROTATION_INTERVAL_SEC);
  }, []);

  const handleToggleAutoPlayCallback = useCallback(() => {
    setAutoPlay((prev) => !prev);
    setTimeLeft(ROTATION_INTERVAL_SEC);
  }, []);

  const handleToggleFullscreenCallback = useCallback(() => {
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
  }, []);

  const handleRefreshData = useCallback(() => {
    refetchSummary();
    refetchDetails();
  }, [refetchSummary, refetchDetails]);

  useTVRemote({
    onLeft: handleToggleSlide,
    onRight: handleToggleSlide,
    onPlayPause: handleToggleAutoPlayCallback,
    onNext: handleToggleSlide,
    onPrev: handleToggleSlide,
    onFullscreen: handleToggleFullscreenCallback,
    onRed: handleToggleSlide,
    onGreen: handleToggleAutoPlayCallback,
    onYellow: handleToggleFullscreenCallback,
    onBlue: handleRefreshData,
    onBack: () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => { });
      }
    },
  });

  // Table columns configuration
  const columns = [
    // { key: 'complaint_number', label: 'ZMAC ID', sortable: true },
    // { key: 'zmac_date', label: 'Punch in Date ', sortable: true, render: (row) => formatDate(row.zmac_date || row.doc) },
    // { key: 'fd_zbrn_status', label: 'Status', sortable: true },
    { key: 'branch', label: 'Branch', sortable: true },
    // { key: 'ticket_no', label: 'Ticket No', sortable: true },
    // { key: 'machine_status', label: 'Machine Status', sortable: true },
    { key: 'model', label: 'Machine Model', sortable: true },
    { key: 'serial_number', label: 'Serial Number', sortable: true },
    { key: 'type_of_damage', label: 'Damage Type', sortable: true },
    // {
    //   key: 'ageing_category',
    //   label: 'Ageing Category',
    //   sortable: true,
    //   render: (row) => {
    //     const days = row.ageing_days;
    //     if (days === 0 || days === '0') return 'Installation Failure';
    //     if (days !== null && days !== undefined && !isNaN(days) && Number(days) > 0 && Number(days) <= 90) return '0-3 Months';
    //     return row.ageing_category || '0-3 Months';
    //   }
    // },
    { key: 'admin_comment', label: 'Remarks', sortable: false }
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
      className={`max-w-[1720px] w-full mx-auto flex flex-col justify-between ${isFullscreen
        ? 'fixed inset-0 z-50 p-3 lg:p-4.5 bg-mist-100 dark:bg-ink-950 h-screen w-screen overflow-hidden box-border space-y-2'
        : 'w-full h-full space-y-3'
        }`}
    >
      {/* Header + Filter controls combined into compact single-frame top section */}
      <div className="space-y-2.5 shrink-0">
        {/* Top Controls Header */}
        <div className={`p-3 lg:p-4 rounded-xl border transition-all ${isAdmin
          ? 'bg-neutral-950 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
          : 'bg-white dark:bg-ink-900 border-mist-300 dark:border-ink-800 shadow-xs'
          }`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-signal/20 text-signal-dark dark:text-signal border border-signal/40 uppercase tracking-widest animate-pulse">
                Showcase Mode
              </span>
              <h2 className="font-display text-lg lg:text-2xl font-extrabold text-ink-950 dark:text-white tracking-tight">
                Machine Replacement - FQC
              </h2>
            </div>

            {/* Action Bar & Mode Switcher */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* View Switcher Tabs */}
              <div className="inline-flex p-1 rounded-xl bg-mist-200/80 dark:bg-ink-950 border border-mist-300 dark:border-ink-800">
                <button
                  tabIndex={0}
                  onClick={() => handleSelectSlide('pie')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs lg:text-sm font-extrabold transition-all cursor-pointer ${activeSlide === 'pie'
                    ? 'bg-white dark:bg-ink-800 text-ink-950 dark:text-white shadow-xs ring-2 ring-signal/50'
                    : 'text-ink-600 dark:text-mist-400 hover:text-ink-950 dark:hover:text-white'
                    }`}
                >
                  🥧 Pie Chart View
                </button>
                <button
                  tabIndex={0}
                  onClick={() => handleSelectSlide('table')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs lg:text-sm font-extrabold transition-all cursor-pointer ${activeSlide === 'table'
                    ? 'bg-white dark:bg-ink-800 text-ink-950 dark:text-white shadow-xs ring-2 ring-signal/50'
                    : 'text-ink-600 dark:text-mist-400 hover:text-ink-950 dark:hover:text-white'
                    }`}
                >
                  📋 Data Table View
                </button>
              </div>

              {/* Play / Pause Rotation Toggle */}
              <button
                tabIndex={0}
                onClick={toggleAutoPlay}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs lg:text-sm font-extrabold border transition-all cursor-pointer ${autoPlay
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                  : 'border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20'
                  }`}
                title={autoPlay ? 'Pause 30s slideshow' : 'Resume 30s slideshow'}
              >
                {autoPlay ? '⏸ Pause' : '▶ Play'}
              </button>

              {/* Next View Button */}
              <button
                tabIndex={0}
                onClick={() => handleSelectSlide(activeSlide === 'pie' ? 'table' : 'pie')}
                className="px-3 py-1.5 text-xs lg:text-sm font-extrabold rounded-xl border border-mist-300 dark:border-ink-700 bg-mist-100 dark:bg-ink-800 text-ink-800 dark:text-mist-200 hover:bg-mist-200 dark:hover:bg-ink-700 transition-all cursor-pointer"
                title="Switch to next slide"
              >
                Next ➔
              </button>

              {/* Fullscreen Toggle */}
              <button
                tabIndex={0}
                onClick={toggleFullscreen}
                className="px-3 py-1.5 text-xs lg:text-sm font-extrabold rounded-xl border border-mist-300 dark:border-ink-700 bg-mist-100 dark:bg-ink-800 text-ink-800 dark:text-mist-200 hover:bg-mist-200 dark:hover:bg-ink-700 transition-all cursor-pointer"
                title="Fullscreen mode"
              >
                {isFullscreen ? '↙ Exit Fullscreen' : 'Fullscreen'}
              </button>
            </div>
          </div>

          {/* Animated 15s Timer Countdown Bar */}
          <div className="mt-2 pt-1.5 border-t border-mist-200 dark:border-ink-800/60">
            <div className="flex items-center justify-between text-xs lg:text-sm font-bold text-ink-500 dark:text-mist-400 mb-1">
              <span className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${autoPlay ? 'bg-green-500 animate-ping' : 'bg-amber-500'}`} />
                Current View: <strong className="text-ink-950 dark:text-white uppercase font-black">{activeSlide === 'pie' ? 'Pie Chart' : 'Data Table'}</strong>
              </span>
              <span className="text-[11px] font-extrabold text-signal-dark dark:text-signal bg-signal/15 px-2 py-0.5 rounded border border-signal/30">
                {date === 'latest'
                  ? `Date: ${summaryData?.data?.activeDate || summaryData?.data?.latestDate
                    ? new Date(summaryData?.data?.activeDate || summaryData?.data?.latestDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })
                    : ''}`
                  : `Date: ${new Date(date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}`}
              </span>
              <span>
                {autoPlay ? `Auto-switching in ${timeLeft}s` : 'Paused'}
              </span>
            </div>

            <div className="w-full h-2 rounded-full overflow-hidden bg-mist-200 dark:bg-ink-800">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${autoPlay ? 'bg-signal' : 'bg-amber-500'
                  }`}
                style={{ width: `${autoPlay ? progressPercent : 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filter Bar for Showcase Data */}
        {/* <FilterBar
          // search={activeSlide === 'table' ? search : ''}
          // onSearchChange={activeSlide === 'table' ? setSearch : undefined}
          // date={date === 'latest' ? (summaryData?.data?.activeDate || summaryData?.data?.latestDate || '') : date}
          // onDateChange={(val) => setDate(val || 'latest')}
          dateLabel="ZMAC Date"
          typeOfDamage={typeOfDamage}
          onDamageTypeChange={setTypeOfDamage}
          productCategory={productCategory}
          onProductCategoryChange={setProductCategory}
        /> */}
      </div>

      {/* Main Slide Area: Both kept mounted in DOM to PREVENT re-animation on slide switch */}
      <div className="flex-1 min-h-0 flex flex-col justify-center overflow-hidden my-auto">
        {/* Slide 1: Pie Chart (Always mounted, hidden when activeSlide !== 'pie') */}
        <div className={activeSlide === 'pie' ? 'block h-full flex flex-col justify-between overflow-hidden' : 'hidden'}>
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
        <div className={activeSlide === 'table' ? 'block h-full flex flex-col justify-between overflow-hidden space-y-2' : 'hidden'}>
          <div className="flex items-center justify-between shrink-0">
            <h3 className="text-sm font-bold text-ink-950 dark:text-white flex items-center gap-1.5">
              <span>📋</span> Product Replacement Functional Defects Table
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
            <div className="flex-1 min-h-0 overflow-hidden">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
