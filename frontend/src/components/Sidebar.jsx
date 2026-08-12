// ============================================================
// Sidebar Component
// ------------------------------------------------------------
// Primary navigation for the dashboard. Collapses to an
// off-canvas drawer on small screens via the `open` prop
// controlled by DashboardLayout.
// ============================================================

import { NavLink } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: GridIcon },
  { to: '/product-replacement', label: 'Product Replacement', icon: BoxIcon },
  { to: '/product-replacement/showcase', label: 'PR Showcase', icon: TvIcon },
  { to: '/part-replacement', label: 'Part Replacement', icon: CogIcon },
  { to: '/upload', label: 'Upload Data', icon: UploadIcon },
  // { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Sidebar({ open, onClose }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink-950/50 dark:bg-black/70 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed z-40 inset-y-0 left-0 w-60 lg:w-64 bg-ink-950 dark:bg-ink-900 text-mist-200 border-r border-ink-800 dark:border-ink-800/80 flex flex-col h-full shrink-0 transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${open ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex items-center gap-2.5 px-5 h-14 lg:h-16 border-b border-ink-800 shrink-0">
          <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-signal flex items-center justify-center font-display font-bold text-ink-950 text-xs lg:text-sm">
            QA
          </div>
          <span className="font-display font-semibold text-white tracking-tight text-sm lg:text-base">Quality Dashboard</span>
        </div>

        <nav className="flex-1 px-3 py-3 lg:py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              tabIndex={0}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 lg:py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-ink-800 text-white ring-2 ring-signal/50'
                  : 'text-mist-400 hover:bg-ink-900 hover:text-mist-200'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Theme Switcher */}
        <div className="p-3 border-t border-ink-800 shrink-0">
          <button
            tabIndex={0}
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-ink-900/90 hover:bg-ink-800 border border-ink-700/60 text-xs text-mist-200 transition-all cursor-pointer shadow-xs"
            title="Click to toggle Light/Dark Mode"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">{isDark ? '🌙' : '☀️'}</span>
              <span className="font-medium text-mist-200">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isDark ? 'bg-signal' : 'bg-ink-700'}`}>
              <div className={`w-3 h-3 rounded-full bg-white transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}

// ---- Inline icon components (kept lightweight, no external icon package) ----
function GridIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <rect x="3" y="3" width="6" height="6" rx="1.2" />
      <rect x="11" y="3" width="6" height="6" rx="1.2" />
      <rect x="3" y="11" width="6" height="6" rx="1.2" />
      <rect x="11" y="11" width="6" height="6" rx="1.2" />
    </svg>
  );
}
function BoxIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M3 6.5 10 3l7 3.5-7 3.5-7-3.5Z" />
      <path d="M3 6.5v7L10 17l7-3.5v-7" />
      <path d="M10 10v7" />
    </svg>
  );
}
function CogIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 3v1.6M10 15.4V17M17 10h-1.6M4.6 10H3M14.9 5.1l-1.1 1.1M6.2 13.7l-1.1 1.1M14.9 14.9l-1.1-1.1M6.2 6.2 5.1 5.1" />
    </svg>
  );
}
function ChartIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M4 16V9M10 16V4M16 16v-6" />
      <path d="M2 16h16" strokeLinecap="round" />
    </svg>
  );
}
function UploadIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M10 13V4M6.5 7.5 10 4l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 14.5v1a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5v-1" strokeLinecap="round" />
    </svg>
  );
}
function SettingsIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M3 5h14M3 10h14M3 15h8" strokeLinecap="round" />
    </svg>
  );
}
function TvIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <rect x="2" y="4" width="16" height="11" rx="2" />
      <path d="M7 18h6M10 15v3" strokeLinecap="round" />
    </svg>
  );
}
