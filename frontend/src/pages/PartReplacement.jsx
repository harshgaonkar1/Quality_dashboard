// ============================================================
// Part Replacement Page
// ------------------------------------------------------------
// Reads ONLY from MySQL via /api/part/dashboard. Displays the
// six ageing-bucket summary cards; clicking one navigates to the
// details page pre-filtered to that bucket.
// ============================================================

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { fetchDashboardSummary } from '../services/partReplacementService';
import SummaryCard from '../components/SummaryCard';
import AgeingChart from '../components/AgeingChart';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

export default function PartReplacement() {
  const navigate = useNavigate();
  const [subCategory, setSubCategory] = useState('');

  const fetchFn = useCallback(() => fetchDashboardSummary({ subCategory }), [subCategory]);
  const { data, loading, error, refetch } = useFetch(fetchFn, [fetchFn]);

  function handleCardClick(categoryKey) {
    const params = new URLSearchParams();
    if (categoryKey) params.set('ageingCategory', categoryKey);
    if (subCategory) params.set('subCategory', subCategory);
    navigate(`/part-replacement/details?${params.toString()}`);
  }

  function handleViewAll() {
    const params = new URLSearchParams();
    if (subCategory) params.set('subCategory', subCategory);
    const queryString = params.toString();
    navigate(`/part-replacement/details${queryString ? `?${queryString}` : ''}`);
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-950">Part Replacement</h2>
          <p className="text-sm text-ink-500 mt-1">
            SPU Status: ClosedByStoreExecutive · Machine Status: Warranty · Product Category: WM · Rej Qty: 0
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-mist-200 rounded-lg px-3 py-1.5 shadow-xs">
            <label htmlFor="part-sub-category-overview" className="text-xs font-semibold text-ink-500 whitespace-nowrap">
              Sub Category:
            </label>
            <select
              id="part-sub-category-overview"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              className="text-xs font-semibold text-ink-900 bg-transparent border-none focus:outline-none cursor-pointer pr-1"
            >
              <option value="">All Models</option>
              <option value="TL">TL Models (TLU)</option>
              <option value="FL">FL Models (FLU)</option>
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

      {loading && <LoadingSpinner label="Loading part replacement summary…" />}
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
