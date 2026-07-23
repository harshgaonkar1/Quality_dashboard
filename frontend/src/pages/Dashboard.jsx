// ============================================================
// Dashboard (Overview) Page
// ------------------------------------------------------------
// Landing page: high-level summary pulled from the Product
// Replacement dataset, with quick links into the deeper pages.
// ============================================================

import { Link } from 'react-router-dom';
import { useCallback } from 'react';
import { useFetch } from '../hooks/useFetch';
import { fetchDashboardSummary } from '../services/productReplacementService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import AgeingChart from '../components/AgeingChart';

export default function Dashboard() {
  const fetchFn = useCallback(() => fetchDashboardSummary(), []);
  const { data, loading, error, refetch } = useFetch(fetchFn, []);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink-950">Welcome back</h2>
        <p className="text-ink-500 text-sm mt-1">
          A live snapshot of complaint ageing across active product replacement cases.
        </p>
      </div>

      {loading && <LoadingSpinner label="Loading dashboard summary…" />}
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="panel p-6 flex flex-col justify-between">
              <div>
                <p className="label-text">Total Open Cases</p>
                <p className="mt-2 text-4xl font-display font-bold text-ink-950 tabular-nums">
                  {data.data.total.toLocaleString()}
                </p>
                <p className="text-sm text-ink-500 mt-1">Approved / Approved for Upgrade · Functional damage</p>
              </div>
              <Link to="/product-replacement" className="btn-primary mt-6 self-start">
                View Product Replacement
              </Link>
            </div>

            <div className="panel p-6">
              <p className="label-text mb-3">Ageing Distribution</p>
              <AgeingChart cards={data.data.cards} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <QuickLinkCard
              to="/product-replacement"
              title="Product Replacement"
              description="Track complaint ageing for approved product replacements."
            />
            <QuickLinkCard
              to="/part-replacement"
              title="Part Replacement"
              description="Monitor part-level replacement cases and turnaround."
            />
            <QuickLinkCard
              to="/upload"
              title="Upload Data"
              description="Load Excel files for the initial data migration phase."
            />
          </div>
        </>
      )}
    </div>
  );
}

function QuickLinkCard({ to, title, description }) {
  return (
    <Link to={to} className="panel p-5 hover:-translate-y-0.5 hover:shadow-lg transition-transform block">
      <h3 className="font-display font-semibold text-ink-950">{title}</h3>
      <p className="text-sm text-ink-500 mt-1">{description}</p>
    </Link>
  );
}
