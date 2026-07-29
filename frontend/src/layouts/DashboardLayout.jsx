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
  const { isAdmin, openAdminModal, logoutAdmin } = useAdmin();

  const title =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/product-replacement') ? 'Product Replacement Details' :
     location.pathname.startsWith('/part-replacement') ? 'Part Replacement Details' : 'Service Ops');

  return (
    <div className={`h-screen flex overflow-hidden ${isAdmin ? 'bg-black text-green-400 font-mono' : 'bg-mist-100'}`}>
      <AdminModal />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className={`h-14 lg:h-16 shrink-0 flex items-center justify-between px-4 lg:px-8 border-b transition-colors ${
          isAdmin ? 'bg-neutral-950 border-green-500/40 text-green-400' : 'bg-white border-mist-300'
        }`}>
          <div className="flex items-center gap-3">
            <button
              className={`lg:hidden p-2 -ml-2 rounded-md ${isAdmin ? 'text-green-400 hover:bg-neutral-900' : 'text-ink-700 hover:bg-mist-100'}`}
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-5 h-5">
                <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
              </svg>
            </button>
            <h1 className={`font-display font-semibold text-base lg:text-lg ${isAdmin ? 'text-green-400 font-mono' : 'text-ink-950'}`}>
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin ? (
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/50 text-green-400 text-xs font-bold font-mono animate-pulse">
                  <span>⚡</span> ADMIN MODE ACTIVE
                </span>
                <button
                  onClick={logoutAdmin}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-300 transition-all shadow-xs cursor-pointer"
                  title="Logout from Admin Mode"
                >
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
                    <path d="M13 15l4-4-4-4M17 11H7M10 3H5a2 2 0 00-2 2v10a2 2 0 002 2h5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Logout Admin
                </button>
              </div>
            ) : (
              <button
                onClick={openAdminModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold transition-all shadow-xs"
              >
                <span>⚡</span> Login to Admin
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 xl:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
