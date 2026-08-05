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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="bg-black border-2 border-green-500/70 rounded-2xl p-6 w-full max-w-md shadow-[0_0_30px_rgba(34,197,94,0.3)] space-y-5 text-green-400 font-mono relative overflow-hidden">
        {/* Terminal Scanline Background Highlight */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_50%,rgba(34,197,94,0.05)_51%)] bg-[length:100%_4px] pointer-events-none" />

        <div className="flex items-center justify-between border-b border-green-500/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]">
              ⚡
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wider uppercase text-green-400">ROOT_ACCESS://AUTH_GATE</h3>
              <p className="text-[10px] text-green-500/70">AUTHENTICATION REQUIRED</p>
            </div>
          </div>
          <button
            onClick={closeAdminModal}
            className="text-neutral-500 hover:text-green-400 transition-colors text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-green-400/90 leading-relaxed font-mono">
          Enter master admin key to authorize and activate full Matrix terminal interface mode.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-password-input" className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 text-green-400">
              Passkey &gt;
            </label>
            <div className="relative">
              <input
                id="admin-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password..."
                autoFocus
                className="w-full bg-neutral-950 border border-green-500/60 focus:border-green-400 rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-green-400 placeholder-green-800 focus:outline-none focus:ring-1 focus:ring-green-400 transition-all font-mono shadow-[inset_0_0_8px_rgba(0,0,0,0.8)]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-500/60 animate-pulse">🔑</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/80 border border-red-500/60 text-red-400 text-xs font-mono font-medium flex items-center gap-2 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              <span>⚠️</span>
              <span>ACCESS_DENIED: {errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-green-500/30">
            <button
              type="button"
              onClick={closeAdminModal}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-green-500 hover:bg-green-400 text-black transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)] disabled:opacity-50 cursor-pointer uppercase tracking-wider"
            >
              {loading ? 'Authenticating…' : 'Unlock Matrix Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
