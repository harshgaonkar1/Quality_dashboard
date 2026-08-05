// ============================================================
// Settings Page
// ------------------------------------------------------------
// Application preferences, appearance & theme settings, and
// connection details.
// ============================================================

import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const { theme, setTheme, isDark } = useTheme();

  const themeOptions = [
    {
      id: 'light',
      name: 'Light Mode',
      desc: 'Clean, high-clarity daylight theme',
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 text-amber-500">
          <circle cx="10" cy="10" r="4" />
          <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.34 4.34l1.42 1.42M14.24 14.24l1.42 1.42M4.34 15.66l1.42-1.42M14.24 5.76l1.42-1.42" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'dark',
      name: 'Dark Mode',
      desc: 'Sleek dark theme optimized for low light',
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 text-signal">
          <path d="M17.25 10.5A7.25 7.25 0 119.5 2.75a5.75 5.75 0 007.75 7.75z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'system',
      name: 'System Default',
      desc: 'Sync automatically with OS preference',
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 text-indigo-400">
          <rect x="3" y="4" width="14" height="10" rx="2" />
          <path d="M7 17h6M10 14v3" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-ink-950 dark:text-mist-100">Settings</h2>
        <p className="text-sm text-ink-500 dark:text-mist-400 mt-1">Application preferences and connection details.</p>
      </div>

      {/* Theme Selection Section */}
      <div className="panel p-6">
        <h3 className="text-base font-semibold text-ink-950 dark:text-mist-100 mb-1">Appearance & Theme</h3>
        <p className="text-xs text-ink-500 dark:text-mist-400 mb-4">Choose how the dashboard looks for your workspace.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themeOptions.map((opt) => {
            const isSelected = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'border-signal bg-signal/5 dark:bg-signal/10 ring-1 ring-signal'
                    : 'border-mist-300 dark:border-ink-800 bg-white dark:bg-ink-900/50 hover:border-mist-400 dark:hover:border-ink-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="p-2 rounded-lg bg-mist-100 dark:bg-ink-800">{opt.icon}</div>
                  {isSelected && (
                    <span className="w-2.5 h-2.5 rounded-full bg-signal shadow-xs" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-ink-950 dark:text-mist-100">{opt.name}</h4>
                  <p className="text-xs text-ink-500 dark:text-mist-400 mt-1 leading-snug">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-mist-200 dark:border-ink-800 flex items-center justify-between text-xs">
          <span className="text-ink-500 dark:text-mist-400">Current Active Theme:</span>
          <span className="font-semibold text-ink-900 dark:text-mist-200 capitalize">
            {theme} {theme === 'system' ? `(${isDark ? 'Dark active' : 'Light active'})` : ''}
          </span>
        </div>
      </div>

      {/* System Connection Info Section */}
      <div className="panel p-6 space-y-4">
        <h3 className="text-base font-semibold text-ink-950 dark:text-mist-100 mb-1">Environment Info</h3>
        <div className="flex items-center justify-between py-2 border-b border-mist-200 dark:border-ink-800">
          <div>
            <p className="text-sm font-medium text-ink-900 dark:text-mist-200">API Base URL</p>
            <p className="text-xs text-ink-500 dark:text-mist-400">Configured via VITE_API_BASE_URL</p>
          </div>
          <code className="text-xs bg-mist-100 dark:bg-ink-800 px-2.5 py-1 rounded text-ink-700 dark:text-mist-300 font-mono">
            {import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}
          </code>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-ink-900 dark:text-mist-200">Data Source</p>
            <p className="text-xs text-ink-500 dark:text-mist-400">All dashboard reads come from Supabase PostgreSQL</p>
          </div>
          <span className="text-xs font-semibold bg-signal/10 text-signal-dark dark:text-signal-light px-2.5 py-1 rounded-full">
            Supabase PostgreSQL
          </span>
        </div>
      </div>
    </div>
  );
}
