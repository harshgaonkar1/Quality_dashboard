// ============================================================
// Summary Card
// ------------------------------------------------------------
// Displays a single ageing-bucket count. Clicking navigates to
// the filtered details page for that bucket.
// ============================================================

const ACCENTS = {
  '0-3-months': 'bg-signal/10 text-signal-dark',
  '1-year': 'bg-ink-900/5 text-ink-800',
  '2-year': 'bg-amber/15 text-amber',
  '3-year': 'bg-orange-100 text-orange-600',
  '4-year': 'bg-red-100 text-red-500',
  'more-than-4-years': 'bg-danger/10 text-danger',
};

export default function SummaryCard({ label, count, categoryKey, onClick }) {
  const accent = ACCENTS[categoryKey] || 'bg-mist-200 text-ink-700';

  return (
    <button
      onClick={() => onClick?.(categoryKey)}
      className="panel p-5 text-left w-full transition-transform hover:-translate-y-0.5 hover:shadow-lg focus-visible:-translate-y-0.5"
    >
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-4 ${accent}`}>
        <span className="w-2.5 h-2.5 rounded-full bg-current" />
      </div>
      <div className="text-3xl font-display font-bold text-ink-950 tabular-nums">{count.toLocaleString()}</div>
      <div className="mt-1.5 text-sm font-medium text-ink-500">{label}</div>
    </button>
  );
}
