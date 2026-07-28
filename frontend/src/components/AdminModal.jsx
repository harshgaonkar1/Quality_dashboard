// ============================================================
// Admin Password Modal
// ------------------------------------------------------------
// Prompts user for Admin password to activate Admin Mode.
// ============================================================

import { useState } from 'react';
import { useAdmin } from '../context/AdminContext';

export default function AdminModal() {
  const { isModalOpen, closeAdminModal, loginAdmin, errorMsg, loading } = useAdmin();
  const [password, setPassword] = useState('');

  if (!isModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    const success = await loginAdmin(password.trim());
    if (success) {
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-neutral-900 border border-green-500/50 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5 text-green-400 font-mono">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/40">
              ⚡
            </div>
            <h3 className="text-lg font-bold tracking-tight text-green-400">Admin Mode Access</h3>
          </div>
          <button
            onClick={closeAdminModal}
            className="text-neutral-500 hover:text-green-400 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-green-500/80 leading-relaxed">
          Enter the master admin password to unlock Admin Mode, dark Matrix theme, and row comments management.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-password-input" className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-green-400">
              Admin Password
            </label>
            <input
              id="admin-password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              autoFocus
              className="w-full bg-black border border-green-500/40 focus:border-green-400 rounded-lg px-3.5 py-2 text-sm text-green-400 placeholder-green-800 focus:outline-none focus:ring-1 focus:ring-green-400 transition-all font-mono"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/50 text-red-400 text-xs font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeAdminModal}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-green-500 hover:bg-green-400 text-black transition-all shadow-md shadow-green-500/20 disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Unlock Admin Mode'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
