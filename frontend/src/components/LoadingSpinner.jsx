// ============================================================
// Loading Spinner
// ============================================================

export default function LoadingSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-500">
      <div className="w-8 h-8 rounded-full border-2 border-mist-300 border-t-signal animate-spin" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
