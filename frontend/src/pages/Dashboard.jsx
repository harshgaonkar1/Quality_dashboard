// ============================================================
// Dashboard (Overview) Page
// ------------------------------------------------------------
// Landing page: high-level summary pulled from BOTH Product
// Replacement (filtered by ZMAC Date) and Part Replacement
// (filtered by SPU Created Date), with Single Date filtering
// and Ageing Distribution graphs for both modules.
// ============================================================

import { Link, useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';
import { useFetch } from '../hooks/useFetch';
import { fetchDashboardSummary as fetchProductSummary } from '../services/productReplacementService';
import { fetchDashboardSummary as fetchPartSummary } from '../services/partReplacementService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import AgeingChart from '../components/AgeingChart';
import FilterBar from '../components/FilterBar';

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get('date') || '';

  const fetchProductFn = useCallback(
    () => fetchProductSummary({ date: date || undefined }),
    [date]
  );
  const fetchPartFn = useCallback(
    () => fetchPartSummary({ date: date || undefined }),
    [date]
  );

  const {
    data: productData,
    loading: productLoading,
    error: productError,
    refetch: refetchProduct,
  } = useFetch(fetchProductFn, [fetchProductFn]);

  const {
    data: partData,
    loading: partLoading,
    error: partError,
    refetch: refetchPart,
  } = useFetch(fetchPartFn, [fetchPartFn]);

  function handleDateChange(val) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) next.set('date', val);
      else next.delete('date');
      return next;
    });
  }

  const isLoading = productLoading || partLoading;

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink-950 dark:text-mist-100">Quality Dashboard Overview</h2>
          <p className="text-ink-500 dark:text-mist-400 text-sm mt-1">
            Live complaint ageing analytics for Product Replacement and Part Replacement.
          </p>
        </div>

        <FilterBar
          date={date}
          onDateChange={handleDateChange}
          dateLabel="Filter Date"
        />
      </div>

      {isLoading && !productData && !partData && (
        <LoadingSpinner label="Loading metrics and ageing graphs…" />
      )}
      {(productError || partError) && (
        <ErrorBanner
          message={productError || partError}
          onRetry={() => {
            refetchProduct();
            refetchPart();
          }}
        />
      )}

      {/* SECTION 1: PRODUCT REPLACEMENT */}
      {productData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-mist-300 dark:border-ink-800 pb-2">
            <h3 className="font-display text-lg font-bold text-ink-950 dark:text-mist-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-signal inline-block" />
              Product Replacement Overview
            </h3>
            <span className="text-xs font-semibold text-ink-500 dark:text-mist-300 bg-mist-100 dark:bg-ink-800 px-2.5 py-1 rounded-full">
              Filtered by ZMAC Date
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="panel p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-mist-200 dark:border-ink-800 pb-3">
                  <div>
                    <p className="label-text">Total Open Product Cases</p>
                    <p className="mt-1 text-4xl font-display font-bold text-ink-950 dark:text-mist-100 tabular-nums">
                      {productData.data.total.toLocaleString()}
                    </p>
                  </div>
                  <span className="badge badge-accent text-xs font-semibold px-2.5 py-1">Product Cases</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Link
                    to={`/product-replacement?productCategory=TL${date ? `&date=${date}` : ''}`}
                    className="p-3 rounded-lg bg-mist-100/60 dark:bg-ink-950/60 border border-mist-200 dark:border-ink-800 hover:bg-mist-200/60 dark:hover:bg-ink-800/60 transition-colors block"
                  >
                    <p className="text-xs font-semibold text-ink-500 dark:text-mist-400">TL Models</p>
                    <p className="text-2xl font-display font-bold text-ink-900 dark:text-mist-100 tabular-nums mt-0.5">
                      {(productData.data.tlCount || 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-ink-400 dark:text-ink-500 mt-0.5">Top Load</p>
                  </Link>

                  <Link
                    to={`/product-replacement?productCategory=FL${date ? `&date=${date}` : ''}`}
                    className="p-3 rounded-lg bg-mist-100/60 dark:bg-ink-950/60 border border-mist-200 dark:border-ink-800 hover:bg-mist-200/60 dark:hover:bg-ink-800/60 transition-colors block"
                  >
                    <p className="text-xs font-semibold text-ink-500 dark:text-mist-400">FL Models</p>
                    <p className="text-2xl font-display font-bold text-ink-900 dark:text-mist-100 tabular-nums mt-0.5">
                      {(productData.data.flCount || 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-ink-400 dark:text-ink-500 mt-0.5">Front Load</p>
                  </Link>
                </div>
              </div>
              <Link to={`/product-replacement${date ? `?date=${date}` : ''}`} className="btn-primary self-start">
                View Product Replacement Details
              </Link>
            </div>

            <div className="panel p-6">
              <p className="label-text mb-3">Product Ageing Distribution</p>
              <AgeingChart cards={productData.data.cards} />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: PART REPLACEMENT */}
      {partData && (
        <div className="space-y-4 pt-4 border-t border-mist-300 dark:border-ink-800">
          <div className="flex items-center justify-between border-b border-mist-300 dark:border-ink-800 pb-2">
            <h3 className="font-display text-lg font-bold text-ink-950 dark:text-mist-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-signal-dark inline-block" />
              Part Replacement Overview
            </h3>
            <span className="text-xs font-semibold text-ink-500 dark:text-mist-300 bg-mist-100 dark:bg-ink-800 px-2.5 py-1 rounded-full">
              Filtered by SPU Created Date
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="panel p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-mist-200 dark:border-ink-800 pb-3">
                  <div>
                    <p className="label-text">Total Open Part Cases</p>
                    <p className="mt-1 text-4xl font-display font-bold text-ink-950 dark:text-mist-100 tabular-nums">
                      {partData.data.total.toLocaleString()}
                    </p>
                  </div>
                  <span className="badge border border-signal-dark/30 text-xs font-semibold px-2.5 py-1">Part Cases</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Link
                    to={`/part-replacement?subCategory=TL${date ? `&date=${date}` : ''}`}
                    className="p-3 rounded-lg bg-mist-100/60 dark:bg-ink-950/60 border border-mist-200 dark:border-ink-800 hover:bg-mist-200/60 dark:hover:bg-ink-800/60 transition-colors block"
                  >
                    <p className="text-xs font-semibold text-ink-500 dark:text-mist-400">TL Models (TLU)</p>
                    <p className="text-2xl font-display font-bold text-ink-900 dark:text-mist-100 tabular-nums mt-0.5">
                      {(partData.data.tlCount || 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-ink-400 dark:text-ink-500 mt-0.5">Top Load</p>
                  </Link>

                  <Link
                    to={`/part-replacement?subCategory=FL${date ? `&date=${date}` : ''}`}
                    className="p-3 rounded-lg bg-mist-100/60 dark:bg-ink-950/60 border border-mist-200 dark:border-ink-800 hover:bg-mist-200/60 dark:hover:bg-ink-800/60 transition-colors block"
                  >
                    <p className="text-xs font-semibold text-ink-500 dark:text-mist-400">FL Models (FLU)</p>
                    <p className="text-2xl font-display font-bold text-ink-900 dark:text-mist-100 tabular-nums mt-0.5">
                      {(partData.data.flCount || 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-ink-400 dark:text-ink-500 mt-0.5">Front Load</p>
                  </Link>
                </div>
              </div>
              <Link to={`/part-replacement${date ? `?date=${date}` : ''}`} className="btn-primary self-start">
                View Part Replacement Details
              </Link>
            </div>

            <div className="panel p-6">
              <p className="label-text mb-3">Part Ageing Distribution</p>
              <AgeingChart cards={partData.data.cards} />
            </div>
          </div>
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <QuickLinkCard
          to="/product-replacement"
          title="Product Replacement"
          description="Track complaint ageing & details for product replacements."
        />
        <QuickLinkCard
          to="/part-replacement"
          title="Part Replacement"
          description="Monitor part-level replacement cases & SPU status."
        />
        <QuickLinkCard
          to="/upload"
          title="Upload Data"
          description="Upload new Product or Part Replacement Excel files."
        />
      </div>
    </div>
  );
}

function QuickLinkCard({ to, title, description }) {
  return (
    <Link to={to} className="panel p-5 hover:-translate-y-0.5 hover:shadow-lg transition-transform block">
      <h3 className="font-display font-semibold text-ink-950 dark:text-mist-100">{title}</h3>
      <p className="text-sm text-ink-500 dark:text-mist-400 mt-1">{description}</p>
    </Link>
  );
}
