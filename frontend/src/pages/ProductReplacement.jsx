// ============================================================
// Product Replacement Page
// ------------------------------------------------------------
// Reads ONLY from MySQL via /api/product/dashboard. Displays the
// six ageing-bucket summary cards; clicking one navigates to the
// details page pre-filtered to that bucket.
// ============================================================

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { fetchDashboardSummary } from '../services/productReplacementService';
import SummaryCard from '../components/SummaryCard';
import AgeingChart from '../components/AgeingChart';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

export default function ProductReplacement() {
  const navigate = useNavigate();
  const [typeOfDamage, setTypeOfDamage] = useState('');

  const fetchFn = useCallback(() => fetchDashboardSummary({ typeOfDamage }), [typeOfDamage]);
  const { data, loading, error, refetch } = useFetch(fetchFn, [fetchFn]);

  function handleCardClick(categoryKey) {
    const params = new URLSearchParams();
    if (categoryKey) params.set('ageingCategory', categoryKey);
    if (typeOfDamage) params.set('typeOfDamage', typeOfDamage);
    navigate(`/product-replacement/details?${params.toString()}`);
  }

  function handleViewAll() {
    const params = new URLSearchParams();
    if (typeOfDamage) params.set('typeOfDamage', typeOfDamage);
    const queryString = params.toString();
    navigate(`/product-replacement/details${queryString ? `?${queryString}` : ''}`);
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-950">Product Replacement</h2>
          <p className="text-sm text-ink-500 mt-1">
            FD ZBRN Status: Approved / Approved for Upgrade · Machine Status: SW · Mat Cat: WM / WD
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-mist-200 rounded-lg px-3 py-1.5 shadow-xs">
            <label htmlFor="damage-type-overview" className="text-xs font-semibold text-ink-500 whitespace-nowrap">
              Damage Type:
            </label>
            <select
              id="damage-type-overview"
              value={typeOfDamage}
              onChange={(e) => setTypeOfDamage(e.target.value)}
              className="text-xs font-semibold text-ink-900 bg-transparent border-none focus:outline-none cursor-pointer pr-1"
            >
              <option value="">All Damage Types</option>
              <option value="Functional">Functional Damages</option>
              <option value="Transit">Transit Damages</option>
            </select>
          </div>
          <button
            onClick={handleViewAll}
            className="btn-secondary"
          >
            View all records
          </button>
        </div>
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
