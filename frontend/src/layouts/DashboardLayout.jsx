// ============================================================
// Dashboard Layout
// ------------------------------------------------------------
// Shared shell (sidebar + topbar) rendered around every page via
// React Router's <Outlet />. Manages the mobile sidebar open state
// and Admin Mode header controls + dark theme background.
// ============================================================

import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AdminModal from '../components/AdminModal';
import { useAdmin } from '../context/AdminContext';
import { useTheme } from '../context/ThemeContext';
import { useTVRemote } from '../hooks/useTVRemote';

const PAGE_TITLES = {
  '/': 'FQC Replacement Dashboard',
  '/product-replacement': 'Product Replacement',
  '/product-replacement/showcase': 'Product Replacement Showcase',
  '/part-replacement': 'Part Replacement',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/upload': 'Upload Data',
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { isAdmin, openAdminModal, logoutAdmin } = useAdmin();
  const { isDark, toggleTheme, theme } = useTheme();

  // Enable TV Remote navigation across all dashboard pages
  useTVRemote({
    onBack: () => {
      if (sidebarOpen) {
        setSidebarOpen(false);
      }
    },
  });

  const title =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/product-replacement') ? 'Product Replacement Details' :
      location.pathname.startsWith('/part-replacement') ? 'Part Replacement Details' : 'Service Ops');

  return (
    <div className={`h-screen flex overflow-hidden ${isAdmin ? 'bg-black text-green-400 font-mono' : 'bg-mist-100 dark:bg-ink-950 dark:text-mist-100'}`}>
      <AdminModal />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className={`h-14 lg:h-16 shrink-0 flex items-center justify-between px-4 lg:px-8 border-b transition-colors ${isAdmin ? 'bg-neutral-950 border-green-500/40 text-green-400' : 'bg-white dark:bg-ink-900 border-mist-300 dark:border-ink-800 text-ink-950 dark:text-mist-100'
          }`}>
          <div className="flex items-center gap-3">
            <button
              tabIndex={0}
              className={`lg:hidden p-2 -ml-2 rounded-md ${isAdmin ? 'text-green-400 hover:bg-neutral-900' : 'text-ink-700 dark:text-mist-300 hover:bg-mist-100 dark:hover:bg-ink-800'}`}
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-5 h-5">
                <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
              </svg>
            </button>
            <h1 className={`font-display font-semibold text-base lg:text-lg ${isAdmin ? 'text-green-400 font-mono' : 'text-ink-950 dark:text-mist-100'}`}>
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Quick Dark/Light Mode Toggle Button */}
            <button
              tabIndex={0}
              onClick={toggleTheme}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-xs ${isAdmin
                  ? 'border-green-500/40 bg-green-950/40 text-green-400 hover:bg-green-900/50'
                  : 'border-mist-300 dark:border-ink-700 bg-mist-100/80 dark:bg-ink-800 text-ink-800 dark:text-mist-200 hover:bg-mist-200 dark:hover:bg-ink-700'
                }`}
              title={`Currently in ${isDark ? 'Dark' : 'Light'} Mode. Click to switch theme.`}
              aria-label="Toggle light and dark mode"
            >
              {isDark ? (
                <>
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5 text-amber-400">
                    <circle cx="10" cy="10" r="4" />
                    <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.34 4.34l1.42 1.42M14.24 14.24l1.42 1.42M4.34 15.66l1.42-1.42M14.24 5.76l1.42-1.42" strokeLinecap="round" />
                  </svg>
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5 text-ink-700">
                    <path d="M17.25 10.5A7.25 7.25 0 119.5 2.75a5.75 5.75 0 007.75 7.75z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            {isAdmin ? (
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-green-950/80 border border-green-500/60 text-green-400 text-xs font-bold font-mono animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.3)]">
                  <span>⚡</span> SYSTEM_ADMIN://ROOT_ACCESS
                </span>
                <button
                  tabIndex={0}
                  onClick={logoutAdmin}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold font-mono rounded-lg bg-red-950/90 hover:bg-red-900 border border-red-500/60 text-red-300 transition-all shadow-[0_0_10px_rgba(239,68,68,0.3)] cursor-pointer"
                  title="Logout from Admin Mode"
                >
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
                    <path d="M13 15l4-4-4-4M17 11H7M10 3H5a2 2 0 00-2 2v10a2 2 0 022 2h5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Exit Admin
                </button>
              </div>
            ) : (
              <button
                tabIndex={0}
                onClick={openAdminModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink-900 dark:bg-signal dark:text-ink-950 hover:bg-ink-800 dark:hover:bg-signal-light text-white text-xs font-semibold transition-all shadow-xs"
              >
                <span>⚡</span> Login to Admin
              </button>
            )}
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto ${location.pathname === '/' || location.pathname === '/product-replacement/showcase'
            ? 'p-2.5 lg:p-3.5 h-full flex flex-col justify-between'
            : 'p-4 lg:p-6 xl:p-8'
          }`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
