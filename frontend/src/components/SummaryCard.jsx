// ============================================================
// Summary Card
// ------------------------------------------------------------
// Displays a single ageing-bucket count. Clicking navigates to
// the filtered details page for that bucket.
// ============================================================

const ACCENTS = {
  '0-3-months': 'bg-signal/10 text-signal-dark dark:bg-signal/20 dark:text-signal-light',
  '1-year': 'bg-ink-900/5 text-ink-800 dark:bg-ink-700/50 dark:text-mist-200',
  '2-year': 'bg-amber/15 text-amber dark:bg-amber-500/20 dark:text-amber-400',
  '3-year': 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
  '4-year': 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400',
  'more-than-4-years': 'bg-danger/10 text-danger dark:bg-danger/20 dark:text-red-300',
};

export default function SummaryCard({ label, count, categoryKey, onClick }) {
  const accent = ACCENTS[categoryKey] || 'bg-mist-200 text-ink-700 dark:bg-ink-800 dark:text-mist-300';

  return (
    <button
      onClick={() => onClick?.(categoryKey)}
      className="panel p-5 text-left w-full transition-transform hover:-translate-y-0.5 hover:shadow-lg focus-visible:-translate-y-0.5"
    >
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-4 ${accent}`}>
        <span className="w-2.5 h-2.5 rounded-full bg-current" />
      </div>
      <div className="text-3xl font-display font-bold text-ink-950 dark:text-mist-100 tabular-nums">{count.toLocaleString()}</div>
      <div className="mt-1.5 text-sm font-medium text-ink-500 dark:text-mist-400">{label}</div>
    </button>
  );
}
