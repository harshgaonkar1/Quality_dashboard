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
const WINDOW_SIZE = 10; // Exactly 10 entries displayed per window
const FETCH_SIZE = 500; // Fetch full dataset for smooth continuous auto-scrolling

export default function PartReplacementShowcase() {
  const { isAdmin } = useAdmin();

  // Slide state: 'fl' | 'tl' | 'table'
  const [activeSlide, setActiveSlide] = useState('fl');
  const [autoPlay, setAutoPlay] = useState(true);
  const [timeLeft, setTimeLeft] = useState(ROTATION_INTERVAL_SEC);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Filters state (defaults to 'latest')
  const [productCategory, setProductCategory] = useState('');
  const [date, setDate] = useState('latest');

  // Table state: Window-based pagination (1-10, 11-20, 21-30...)
  const [windowIndex, setWindowIndex] = useState(0);
  const [isTablePaused, setIsTablePaused] = useState(false);
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
        page: 1,
        pageSize: FETCH_SIZE,
        search: debouncedSearch,
        sortBy,
        sortDir,
      }),
    [productCategory, date, debouncedSearch, sortBy, sortDir]
  );
  const {
    data: detailsData,
    loading: detailsLoading,
    error: detailsError,
    refetch: refetchDetails,
  } = useFetch(detailsFetchFn, [detailsFetchFn]);

  // Filter out Microwave / MW models for clean TL & FL dataset
  const allRows = useMemo(() => {
    const rows = detailsData?.data?.rows || [];
    return rows.filter((row) => {
      const model = (row.model || '').toUpperCase();
      const subCat = (row.sub_category || '').toUpperCase();
      const matCat = (row.mat_cat || '').toUpperCase();
      return (
        !model.startsWith('MW') &&
        subCat !== 'MW' &&
        subCat !== 'MWO' &&
        subCat !== 'MICROWAVE' &&
        matCat !== 'MW' &&
        matCat !== 'MWO' &&
        matCat !== 'MICROWAVE'
      );
    });
  }, [detailsData?.data?.rows]);

  const totalWindows = Math.max(1, Math.ceil(allRows.length / WINDOW_SIZE));

  // Auto-cycle through 10-entry windows (1-10 -> 11-20 -> 21-30...) every 5 seconds when table slide is active
  useEffect(() => {
    if (!autoPlay || isTablePaused || activeSlide !== 'table' || totalWindows <= 1) return;

    const windowInterval = setInterval(() => {
      setWindowIndex((prev) => (prev + 1) % totalWindows);
    }, 5000);

    return () => clearInterval(windowInterval);
  }, [autoPlay, isTablePaused, activeSlide, totalWindows]);

  // Reset window index when filters or active slide change
  useEffect(() => {
    setWindowIndex(0);
  }, [productCategory, date, debouncedSearch, activeSlide]);

  // Calculate current 10-entry window slice
  const startIndex = windowIndex * WINDOW_SIZE;
  const endIndex = Math.min(startIndex + WINDOW_SIZE, allRows.length);
  const visibleRows = useMemo(() => {
    return allRows.slice(startIndex, endIndex);
  }, [allRows, startIndex, endIndex]);

  // Handle 30-second auto-rotation countdown timer across 3 slides ('fl' -> 'tl' -> 'table')
  useEffect(() => {
    if (!autoPlay) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setActiveSlide((curr) => {
            if (curr === 'fl') return 'tl';
            if (curr === 'tl') return 'table';
            return 'fl';
          });
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
  const handleNextSlide = useCallback(() => {
    setActiveSlide((curr) => {
      if (curr === 'fl') return 'tl';
      if (curr === 'tl') return 'table';
      return 'fl';
    });
    setTimeLeft(ROTATION_INTERVAL_SEC);
  }, []);

  const handlePrevSlide = useCallback(() => {
    setActiveSlide((curr) => {
      if (curr === 'fl') return 'table';
      if (curr === 'tl') return 'fl';
      return 'tl';
    });
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
    onLeft: handlePrevSlide,
    onRight: handleNextSlide,
    onPlayPause: handleToggleAutoPlayCallback,
    onNext: handleNextSlide,
    onPrev: handlePrevSlide,
    onFullscreen: handleToggleFullscreenCallback,
    onRed: handleNextSlide,
    onGreen: handleToggleAutoPlayCallback,
    onYellow: handleToggleFullscreenCallback,
    onBlue: handleRefreshData,
    onBack: () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => { });
      }
    },
  });

  // Table columns configuration matching ProductReplacementShowcase format
  const columns = [
    { key: 'branch', label: 'Branch', sortable: true },
    { key: 'model', label: 'Machine Model', sortable: true },
    { key: 'serial_number', label: 'Serial Number', sortable: true },
    {
      key: 'part_grouping',
      label: 'Part Grouping',
      sortable: true,
      render: (row) => row.grouping || row.part_grouping || 'Other',
    },
    { key: 'admin_comment', label: 'Remarks', sortable: false }
  ];

  function handleSort(columnKey) {
    setWindowIndex(0);
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
                        handleSelectSlide('fl');
                        setIsMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer w-full text-left ${activeSlide === 'fl'
                        ? 'bg-signal/15 text-signal-dark dark:text-signal border border-signal/40'
                        : 'text-ink-700 dark:text-mist-300 hover:bg-mist-100 dark:hover:bg-ink-800'
                        }`}
                    >
                      FL Parts Graph
                    </button>
                    <button
                      onClick={() => {
                        handleSelectSlide('tl');
                        setIsMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer w-full text-left ${activeSlide === 'tl'
                        ? 'bg-signal/15 text-signal-dark dark:text-signal border border-signal/40'
                        : 'text-ink-700 dark:text-mist-300 hover:bg-mist-100 dark:hover:bg-ink-800'
                        }`}
                    >
                      TL Parts Graph
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
                          handleNextSlide();
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
                Current View:{' '}
                <strong className="text-ink-950 dark:text-white uppercase font-black">
                  {activeSlide === 'fl'
                    ? 'FL Part Grouping'
                    : activeSlide === 'tl'
                    ? 'TL Part Grouping'
                    : 'Data Table'}
                </strong>
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

      {/* Main Slide Area: All 3 kept mounted in DOM to PREVENT re-animation on slide switch */}
      <div className="flex-1 min-h-0 flex flex-col justify-center overflow-hidden my-auto">
        {/* Slide 1: FL Part Grouping Chart (Always mounted, hidden when activeSlide !== 'fl') */}
        <div className={activeSlide === 'fl' ? 'block h-full flex flex-col justify-between overflow-hidden' : 'hidden'}>
          {groupingLoading && !groupingData && <LoadingSpinner label="Loading FL part grouping analytics…" />}
          {groupingError && <ErrorBanner message={groupingError} onRetry={refetchGrouping} />}
          {groupingData && (
            <div className="h-full min-h-0">
              <FLPartGroupingChart
                partGroups={flPartGroups}
                flTotal={flTotal}
                activeDate={activeDate}
                isCompact={isFullscreen}
              />
            </div>
          )}
        </div>

        {/* Slide 2: TL Part Grouping Chart (Always mounted, hidden when activeSlide !== 'tl') */}
        <div className={activeSlide === 'tl' ? 'block h-full flex flex-col justify-between overflow-hidden' : 'hidden'}>
          {groupingLoading && !groupingData && <LoadingSpinner label="Loading TL part grouping analytics…" />}
          {groupingError && <ErrorBanner message={groupingError} onRetry={refetchGrouping} />}
          {groupingData && (
            <div className="h-full min-h-0">
              <TLPartGroupingChart
                partGroups={tlPartGroups}
                tlTotal={tlTotal}
                activeDate={activeDate}
                isCompact={isFullscreen}
              />
            </div>
          )}
        </div>

        {/* Slide 3: Data Table (Always mounted, hidden when activeSlide !== 'table') */}
        <div className={activeSlide === 'table' ? 'block h-full flex flex-col justify-between overflow-hidden space-y-1.5' : 'hidden'}>
          <div className="flex items-center justify-between shrink-0">
            <h3 className="text-xs lg:text-sm font-bold text-ink-950 dark:text-white flex items-center gap-1.5">
              <span>📋</span> Part Replacement Functional Defects Table
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-signal/15 text-signal-dark dark:text-signal border border-signal/30 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${autoPlay && !isTablePaused && totalWindows > 1 ? 'bg-signal animate-pulse' : 'bg-amber-500'}`} />
                Auto-window: {autoPlay && !isTablePaused && totalWindows > 1 ? '5s' : 'Paused'}
              </span>
              {allRows.length > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-mist-200 dark:bg-ink-800 text-ink-700 dark:text-mist-300">
                  Showing {startIndex + 1}-{endIndex} of {allRows.length.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {detailsLoading && !detailsData && <LoadingSpinner label="Loading Table Records..." />}
          {detailsError && <ErrorBanner message={detailsError} onRetry={refetchDetails} />}

          {detailsData?.data && (
            <div
              className="flex-1 min-h-0 overflow-hidden"
              onMouseEnter={() => setIsTablePaused(true)}
              onMouseLeave={() => setIsTablePaused(false)}
            >
              <DataTable
                key={`table-window-${windowIndex}`}
                columns={columns}
                rows={visibleRows}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={handleSort}
                page={windowIndex + 1}
                pageSize={WINDOW_SIZE}
                total={allRows.length}
                onPageChange={(newPage) => {
                  setWindowIndex(Math.max(0, Math.min(newPage - 1, totalWindows - 1)));
                }}
                compact={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
