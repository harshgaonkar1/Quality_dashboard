// ============================================================
// Error Banner
// ============================================================

export default function ErrorBanner({ message, onRetry }) {
  return (
    <div className="panel border-danger/30 bg-danger/5 p-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-5 h-5 text-danger shrink-0 mt-0.5">
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 6.5v4M10 13.2v.1" strokeLinecap="round" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-ink-900">Something went wrong</p>
          <p className="text-sm text-ink-600 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary shrink-0 text-xs px-3 py-2">
          Retry
        </button>
      )}
    </div>
  );
}
