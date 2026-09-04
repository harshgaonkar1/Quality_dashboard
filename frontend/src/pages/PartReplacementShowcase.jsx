// ============================================================
// Part Replacement Showcase Page
// ------------------------------------------------------------
// Showcase/Presentation page mode for Part Replacement.
// Automatically rotates between the Part Grouping Graphs view
// (FL Part Grouping vs TL Part Grouping where X-axis = parts name)
// and the Part Replacement Data Table view every 30 seconds.
// Fits into a single frame screen view (no scrolling).
// Matches the exact design and layout of ProductReplacementShowcase.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';
import { useTVRemote } from '../hooks/useTVRemote';
import { fetchDashboardDetails, fetchPartGroupingSummary } from '../services/partReplacementService';
import FLPartGroupingChart from '../components/FLPartGroupingChart';
import TLPartGroupingChart from '../components/TLPartGroupingChart';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import { useAdmin } from '../context/AdminContext';
import { formatDate } from '../utils/formatDate';

const ROTATION_INTERVAL_SEC = 30;
const PAGE_SIZE = 50; // High capacity page size so all entries fit on screen for TV showcase view

export default function PartReplacementShowcase() {
  const { isAdmin } = useAdmin();

  // Slide state: 'graphs' | 'table'
  const [activeSlide, setActiveSlide] = useState('graphs');
  const [autoPlay, setAutoPlay] = useState(true);
  const [timeLeft, setTimeLeft] = useState(ROTATION_INTERVAL_SEC);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Filters state (defaults to 'latest')
  const [productCategory, setProductCategory] = useState('');
  const [date, setDate] = useState('latest');

  // Table state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('spu_created_date');
  const [sortDir, setSortDir] = useState('DESC');
  const debouncedSearch = useDebounce(search, 400);

  const containerRef = useRef(null);
  const menuRef = useRef(null);

  // Auto-close hamburger menu on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Auto-enter fullscreen mode when page opens / mounts
  useEffect(() => {
    const tryFullscreen = () => {
      if (containerRef.current && !document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {
          // Native browser fullscreen requires user gesture in some browsers
        });
      }
    };

    tryFullscreen();

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

  // 1. Fetch Summary Data (for FL & TL Part Grouping Graphs)
  const groupingFetchFn = useCallback(
    () => fetchPartGroupingSummary({ productCategory, date }),
    [productCategory, date]
  );
  const {
    data: groupingDataResponse,
    loading: groupingLoading,
    error: groupingError,
    refetch: refetchGrouping,
  } = useFetch(groupingFetchFn, [groupingFetchFn]);

  const groupingData = groupingDataResponse?.data || null;

  const flPartGroups = useMemo(() => groupingData?.flPartGroups || [], [groupingData?.flPartGroups]);
  const tlPartGroups = useMemo(() => groupingData?.tlPartGroups || [], [groupingData?.tlPartGroups]);
  const flTotal = groupingData?.flTotal || 0;
  const tlTotal = groupingData?.tlTotal || 0;
  const activeDate = groupingData?.activeDate || (date !== 'latest' ? date : '');

  // 2. Fetch Details Data (for Data Table)
  const detailsFetchFn = useCallback(
    () =>
      fetchDashboardDetails({
        productCategory: productCategory || undefined,
        date: date || undefined,
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        sortBy,
        sortDir,
      }),
    [productCategory, date, page, debouncedSearch, sortBy, sortDir]
  );
  const {
    data: detailsData,
    loading: detailsLoading,
    error: detailsError,
    refetch: refetchDetails,
  } = useFetch(detailsFetchFn, [detailsFetchFn]);

  // Handle 30-second auto-rotation countdown timer
  useEffect(() => {
    if (!autoPlay) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setActiveSlide((curr) => (curr === 'graphs' ? 'table' : 'graphs'));
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
    setTimeLeft(ROTATION_INTERVAL_SEC);
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
    setActiveSlide((curr) => (curr === 'graphs' ? 'table' : 'graphs'));
    setTimeLeft(ROTATION_INTERVAL_SEC);
  }, []);

  const handleToggleAutoPlayCallback = useCallback(() => {
    setAutoPlay((prev) => !prev);
    setTimeLeft(ROTATION_INTERVAL_SEC);
  }, []);

  const handleToggleFullscreenCallback = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
      setIsFullscreen(false);
    }
  }, []);

  const handleRefreshData = useCallback(() => {
    refetchGrouping();
    refetchDetails();
  }, [refetchGrouping, refetchDetails]);

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

  // Table columns configuration matching user's requirements
  const columns = useMemo(() => [
    { key: 'branch', label: 'Branch', sortable: true },
    { key: 'model', label: 'Machine Model', sortable: true },
    { key: 'serial_number', label: 'Serial Number', sortable: true },
    {
      key: 'grouping',
      label: 'Grouping',
      sortable: true,
      render: (row) => (
        <span className="font-semibold px-2 py-0.5 rounded text-[11px] bg-signal/10 dark:bg-signal/20 text-signal-dark dark:text-signal-light border border-signal/30 inline-block">
          {row.grouping || row.part_grouping || 'Other'}
        </span>
      ),
    },
    { key: 'ticket_no', label: 'Ticket', sortable: true },
    {
      key: 'ageing_days',
      label: 'Ageing',
      sortable: true,
      render: (row) => {
        const days = row.ageing_days;
        if (days === null || days === undefined) {
          return <span className="text-ink-400 dark:text-mist-400 font-mono text-[11px]">N/A</span>;
        }
        if (days === 0 || days === '0') {
          return (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
              0d (Install)
            </span>
          );
        }
        return (
          <span className="font-mono text-[11px] font-bold text-ink-800 dark:text-mist-200">
            {days}d
          </span>
        );
      },
    },
  ], []);

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
        ? 'fixed inset-0 z-50 p-2.5 lg:p-3.5 bg-mist-100 dark:bg-ink-950 h-screen w-screen overflow-hidden box-border space-y-1.5'
        : 'w-full h-full space-y-2'
        }`}
    >
      {/* Header + Filter controls combined into compact single-frame top section */}
      <div className="space-y-1.5 shrink-0">
        {/* Top Controls Header */}
        <div
          className={`p-2.5 lg:p-3 rounded-xl border transition-all ${isAdmin
            ? 'bg-neutral-950 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
            : 'bg-white dark:bg-ink-900 border-mist-300 dark:border-ink-800 shadow-xs'
            }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] lg:text-xs font-black bg-signal/20 text-signal-dark dark:text-signal border border-signal/40 uppercase tracking-widest animate-pulse">
                Showcase Mode
              </span>
              <h2 className="font-display text-base lg:text-xl font-extrabold text-ink-950 dark:text-white tracking-tight">
                Part Replacement — FQC
              </h2>
            </div>

            {/* Hamburger Menu Trigger & Popover */}
            <div className="relative" ref={menuRef}>
              <button
                tabIndex={0}
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="p-1.5 lg:p-2 rounded-xl border border-mist-300 dark:border-ink-700 bg-mist-100 dark:bg-ink-800 text-ink-950 dark:text-white hover:bg-mist-200 dark:hover:bg-ink-700 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                title="Menu Controls"
                aria-label="Toggle Navigation Menu"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  {isMenuOpen ? (
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  ) : (
                    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
                  )}
                </svg>
              </button>

              {/* Dropdown Popover */}
              {isMenuOpen && (
                <div className="absolute right-0 top-11 z-50 w-60 p-2.5 rounded-2xl bg-white dark:bg-ink-900 border border-mist-300 dark:border-ink-700 shadow-2xl space-y-2 font-sans">
                  <div className="text-[10px] font-extrabold text-ink-400 dark:text-mist-400 uppercase tracking-wider px-1">
                    View Mode
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        handleSelectSlide('graphs');
                        setIsMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer w-full text-left ${activeSlide === 'graphs'
                        ? 'bg-signal/15 text-signal-dark dark:text-signal border border-signal/40'
                        : 'text-ink-700 dark:text-mist-300 hover:bg-mist-100 dark:hover:bg-ink-800'
                        }`}
                    >
                      Grouping Graphs View
                    </button>
                    <button
                      onClick={() => {
                        handleSelectSlide('table');
                        setIsMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer w-full text-left ${activeSlide === 'table'
                        ? 'bg-signal/15 text-signal-dark dark:text-signal border border-signal/40'
                        : 'text-ink-700 dark:text-mist-300 hover:bg-mist-100 dark:hover:bg-ink-800'
                        }`}
                    >
                      Data Table View
                    </button>
                  </div>

                  <div className="border-t border-mist-200 dark:border-ink-800 pt-1.5">
                    <div className="text-[10px] font-extrabold text-ink-400 dark:text-mist-400 uppercase tracking-wider px-1 mb-1">
                      Controls
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => {
                          toggleAutoPlay();
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold text-ink-700 dark:text-mist-300 hover:bg-mist-100 dark:hover:bg-ink-800 transition-all cursor-pointer w-full text-left"
                      >
                        {autoPlay ? 'Pause Slideshow' : 'Play Slideshow'}
                      </button>
                      <button
                        onClick={() => {
                          handleSelectSlide(activeSlide === 'graphs' ? 'table' : 'graphs');
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold text-ink-700 dark:text-mist-300 hover:bg-mist-100 dark:hover:bg-ink-800 transition-all cursor-pointer w-full text-left"
                      >
                        Next View
                      </button>
                      <button
                        onClick={() => {
                          toggleFullscreen();
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold text-ink-700 dark:text-mist-300 hover:bg-mist-100 dark:hover:bg-ink-800 transition-all cursor-pointer w-full text-left"
                      >
                        {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                      </button>
                      <button
                        onClick={() => {
                          handleRefreshData();
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold text-ink-700 dark:text-mist-300 hover:bg-mist-100 dark:hover:bg-ink-800 transition-all cursor-pointer w-full text-left"
                      >
                        Refresh Data
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Animated Timer Countdown Bar */}
          <div className="mt-1.5 pt-1 border-t border-mist-200 dark:border-ink-800/60">
            <div className="flex items-center justify-between text-xs font-bold text-ink-500 dark:text-mist-400 mb-0.5">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${autoPlay ? 'bg-green-500 animate-ping' : 'bg-amber-500'}`} />
                Current View: <strong className="text-ink-950 dark:text-white uppercase font-black">{activeSlide === 'graphs' ? 'Grouping Graphs' : 'Data Table'}</strong>
              </span>
              <span className="text-[10px] font-extrabold text-signal-dark dark:text-signal bg-signal/15 px-2 py-0.5 rounded border border-signal/30">
                {date === 'latest'
                  ? `Date: ${formatDate(groupingData?.activeDate || groupingData?.latestDate)}`
                  : `Date: ${formatDate(date)}`}
              </span>
              <span>
                {autoPlay ? `Auto-switching in ${timeLeft}s` : 'Paused'}
              </span>
            </div>

            <div className="w-full h-1.5 rounded-full overflow-hidden bg-mist-200 dark:bg-ink-800">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${autoPlay ? 'bg-signal' : 'bg-amber-500'}`}
                style={{ width: `${autoPlay ? progressPercent : 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Slide Area: Both kept mounted in DOM to PREVENT re-animation on slide switch */}
      <div className="flex-1 min-h-0 flex flex-col justify-center overflow-hidden my-auto">
        {/* Slide 1: Grouping Graphs (Always mounted, hidden when activeSlide !== 'graphs') */}
        <div className={activeSlide === 'graphs' ? 'block h-full flex flex-col justify-between overflow-hidden' : 'hidden'}>
          {groupingLoading && !groupingData && <LoadingSpinner label="Loading part grouping analytics…" />}
          {groupingError && <ErrorBanner message={groupingError} onRetry={refetchGrouping} />}
          {groupingData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full min-h-0">
              {/* FL Part Grouping Chart */}
              <FLPartGroupingChart
                partGroups={flPartGroups}
                flTotal={flTotal}
                activeDate={activeDate}
                isCompact={isFullscreen}
              />

              {/* TL Part Grouping Chart */}
              <TLPartGroupingChart
                partGroups={tlPartGroups}
                tlTotal={tlTotal}
                activeDate={activeDate}
                isCompact={isFullscreen}
              />
            </div>
          )}
        </div>

        {/* Slide 2: Data Table (Always mounted, hidden when activeSlide !== 'table') */}
        <div className={activeSlide === 'table' ? 'block h-full flex flex-col justify-between overflow-hidden space-y-1.5' : 'hidden'}>
          <div className="flex items-center justify-between shrink-0">
            <h3 className="text-xs lg:text-sm font-bold text-ink-950 dark:text-white flex items-center gap-1.5">
              <span>📋</span> Part Replacement Functional Defects Table
            </h3>
            {detailsData?.data && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-mist-200 dark:bg-ink-800 text-ink-700 dark:text-mist-300">
                Total Records: {(detailsData.data.total || 0).toLocaleString()}
              </span>
            )}
          </div>

          {detailsLoading && !detailsData && <LoadingSpinner label="Loading Table Records..." />}
          {detailsError && <ErrorBanner message={detailsError} onRetry={refetchDetails} />}

          {detailsData?.data && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <DataTable
                columns={columns}
                rows={detailsData.data.rows || []}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={handleSort}
                page={detailsData.data.page || page}
                pageSize={detailsData.data.pageSize || PAGE_SIZE}
                total={detailsData.data.total || 0}
                onPageChange={setPage}
                compact={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
