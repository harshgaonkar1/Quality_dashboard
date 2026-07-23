// ============================================================
// Dashboard Layout
// ------------------------------------------------------------
// Shared shell (sidebar + topbar) rendered around every page via
// React Router's <Outlet />. Manages the mobile sidebar open state.
// ============================================================

import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/product-replacement': 'Product Replacement',
  '/part-replacement': 'Part Replacement',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/upload': 'Upload Data',
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const title =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/product-replacement') ? 'Product Replacement Details' : 'Service Ops');

  return (
    <div className="h-screen flex overflow-hidden bg-mist-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-14 lg:h-16 shrink-0 bg-white border-b border-mist-300 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 -ml-2 rounded-md text-ink-700 hover:bg-mist-100"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-5 h-5">
                <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
              </svg>
            </button>
            <h1 className="font-display font-semibold text-base lg:text-lg text-ink-950">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-medium text-ink-500 bg-mist-100 px-3 py-1.5 rounded-full">
              Data source: MySQL
            </span>
            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-ink-900 text-white flex items-center justify-center text-xs lg:text-sm font-semibold">
              A
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 xl:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
