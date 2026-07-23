// ============================================================
// Product Replacement Page
// ------------------------------------------------------------
// Reads ONLY from MySQL via /api/product/dashboard. Displays the
// six ageing-bucket summary cards; clicking one navigates to the
// details page pre-filtered to that bucket.
// ============================================================

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { fetchDashboardSummary } from '../services/productReplacementService';
import SummaryCard from '../components/SummaryCard';
import AgeingChart from '../components/AgeingChart';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

export default function ProductReplacement() {
  const navigate = useNavigate();
  const fetchFn = useCallback(() => fetchDashboardSummary(), []);
  const { data, loading, error, refetch } = useFetch(fetchFn, []);

  function handleCardClick(categoryKey) {
    navigate(`/product-replacement/details?ageingCategory=${categoryKey}`);
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-950">Product Replacement</h2>
          <p className="text-sm text-ink-500 mt-1">
            Filtered to FD ZBRN Status: Approved / Approved for Upgrade · Type of Damage: Functional
          </p>
        </div>
        <button
          onClick={() => navigate('/product-replacement/details')}
          className="btn-secondary"
        >
          View all records
        </button>
      </div>

      {loading && <LoadingSpinner label="Loading summary…" />}
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {data.data.cards.map((card) => (
              <SummaryCard
                key={card.key}
                label={card.label}
                count={card.count}
                categoryKey={card.key}
                onClick={handleCardClick}
              />
            ))}
          </div>

          <div className="panel p-6">
            <p className="label-text mb-3">Ageing Distribution</p>
            <AgeingChart cards={data.data.cards} />
          </div>
        </>
      )}
    </div>
  );
}
