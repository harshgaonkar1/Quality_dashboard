// ============================================================
// Settings Page (placeholder)
// ============================================================

export default function Settings() {
  return (
    <div className="max-w-3xl">
      <h2 className="font-display text-xl font-bold text-ink-950">Settings</h2>
      <p className="text-sm text-ink-500 mt-1">Application preferences and connection details.</p>

      <div className="panel p-6 mt-6 space-y-4">
        <div className="flex items-center justify-between py-2 border-b border-mist-200">
          <div>
            <p className="text-sm font-medium text-ink-900">API Base URL</p>
            <p className="text-xs text-ink-500">Configured via VITE_API_BASE_URL</p>
          </div>
          <code className="text-xs bg-mist-100 px-2.5 py-1 rounded text-ink-700">
            {import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}
          </code>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-ink-900">Data Source</p>
            <p className="text-xs text-ink-500">All dashboard reads come from MySQL</p>
          </div>
          <span className="text-xs font-semibold bg-signal/10 text-signal-dark px-2.5 py-1 rounded-full">
            MySQL
          </span>
        </div>
      </div>
    </div>
  );
}
