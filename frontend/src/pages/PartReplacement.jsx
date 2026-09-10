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
import ModelMultiSelect from '../components/ModelMultiSelect';

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
            SPU Status: ClosedByStoreExecutive · Machine Status: Warranty · Sub Category: FLu / TL / TLU / MW · Approved Qty: ≥ 1 · Rej Qty: 0
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ModelMultiSelect
            value={subCategory}
            onChange={setSubCategory}
            label="Model Type"
          />

          <button
            onClick={() => navigate('/fl-analytics')}
            className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 border border-sky-500/40 text-xs font-bold transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
          >
            <span>📊</span> FL Analytics
          </button>

          <button
            onClick={() => navigate('/part-replacement/showcase')}
            className="px-3 py-1.5 rounded-lg bg-signal/20 hover:bg-signal/30 text-signal-dark dark:text-signal border border-signal/40 text-xs font-bold transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
          >
            <span>📺</span> Showcase Mode
          </button>

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
