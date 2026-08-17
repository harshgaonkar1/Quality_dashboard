// ============================================================
// Action Plan Modal Component
// ------------------------------------------------------------
// Pop-up modal for entering/editing and viewing Action Plan details:
// - Action Done on the issue
// - Responsible Person Name
// - Initiator Name
// ============================================================

import { useEffect, useState } from 'react';
import { saveProductActionPlan } from '../services/productReplacementService';

export default function ActionPlanModal({ isOpen, onClose, row, onSaveSuccess, isAdmin, openAdminModal }) {
  const [actionDone, setActionDone] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [initiatorName, setInitiatorName] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (row) {
      setActionDone(row.action_done || '');
      setResponsiblePerson(row.responsible_person || '');
      setInitiatorName(row.initiator_name || '');
      setSaveSuccess(false);
      setErrorMsg('');
    }
  }, [row, isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !row) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAdmin) {
      openAdminModal();
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSaveSuccess(false);

    try {
      await saveProductActionPlan({
        serialNumber: row.serial_number,
        complaintNumber: row.complaint_number,
        actionDone: actionDone.trim(),
        responsiblePerson: responsiblePerson.trim(),
        initiatorName: initiatorName.trim(),
      });

      setSaveSuccess(true);
      if (onSaveSuccess) {
        onSaveSuccess({
          ...row,
          action_done: actionDone.trim(),
          responsible_person: responsiblePerson.trim(),
          initiator_name: initiatorName.trim(),
          action_plan_date: new Date().toISOString(),
        });
      }

      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to save action plan:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to save action plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-neutral-900 border-2 border-emerald-500/60 rounded-2xl p-6 w-full max-w-xl shadow-[0_0_35px_rgba(16,185,129,0.25)] space-y-5 text-emerald-400 font-mono relative overflow-hidden">
        {/* Terminal Scanline Accent */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_50%,rgba(16,185,129,0.04)_51%)] bg-[length:100%_4px] pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)] text-lg">
              📋
            </div>
            <div>
              <h3 className="text-base font-bold tracking-wider uppercase text-emerald-400">ACTION_PLAN://DETAILS</h3>
              <p className="text-[11px] text-emerald-500/70">Record issue resolution details & accountability</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-emerald-400 transition-colors text-xl font-bold px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Issue Details Summary Card */}
        <div className="bg-black/60 border border-emerald-500/30 rounded-xl p-3.5 space-y-1.5 text-xs text-neutral-300">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-900/60 pb-1.5">
            <span className="font-semibold text-emerald-400">
              Complaint / ZMAC ID: <span className="font-bold text-white">{row.complaint_number || 'N/A'}</span>
            </span>
            <span className="text-[11px] text-neutral-400">
              Serial No: <span className="font-mono text-emerald-300">{row.serial_number || 'N/A'}</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div>
              <span className="text-neutral-400">Model: </span>
              <span className="text-neutral-200 font-medium">{row.model || 'N/A'}</span>
            </div>
            <div>
              <span className="text-neutral-400">Branch: </span>
              <span className="text-neutral-200 font-medium">{row.branch || 'N/A'}</span>
            </div>
            {row.customer_complaint && (
              <div className="col-span-2 text-[11px] text-neutral-300 truncate">
                <span className="text-neutral-400">Customer Complaint: </span>
                <span className="italic">{row.customer_complaint}</span>
              </div>
            )}
          </div>
        </div>

        {!isAdmin && (
          <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-300 text-xs flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span>🔒</span> Viewing Mode. Admin access required to update action plan.
            </span>
            <button
              type="button"
              onClick={openAdminModal}
              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-bold border border-amber-500/40 cursor-pointer"
            >
              Login as Admin
            </button>
          </div>
        )}

        {/* Action Plan Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Action Done Field */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 text-emerald-400">
              What Action Has Been Done On The Issue: <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={actionDone}
              onChange={(e) => setActionDone(e.target.value)}
              placeholder="Describe what action was taken to resolve this issue..."
              disabled={!isAdmin}
              required
              className="w-full bg-black/80 border border-emerald-500/50 focus:border-emerald-400 rounded-lg p-3 text-emerald-300 placeholder-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all font-mono shadow-[inset_0_0_8px_rgba(0,0,0,0.8)] disabled:opacity-75 disabled:cursor-not-allowed resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Responsible Person Field */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 text-emerald-400">
                Responsible Person Name: <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={responsiblePerson}
                onChange={(e) => setResponsiblePerson(e.target.value)}
                placeholder="Name of person responsible..."
                disabled={!isAdmin}
                required
                className="w-full bg-black/80 border border-emerald-500/50 focus:border-emerald-400 rounded-lg px-3 py-2 text-emerald-300 placeholder-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all font-mono shadow-[inset_0_0_8px_rgba(0,0,0,0.8)] disabled:opacity-75 disabled:cursor-not-allowed"
              />
            </div>

            {/* Initiator Name Field */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 text-emerald-400">
                Initiator Name: <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={initiatorName}
                onChange={(e) => setInitiatorName(e.target.value)}
                placeholder="Name of initiator..."
                disabled={!isAdmin}
                required
                className="w-full bg-black/80 border border-emerald-500/50 focus:border-emerald-400 rounded-lg px-3 py-2 text-emerald-300 placeholder-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all font-mono shadow-[inset_0_0_8px_rgba(0,0,0,0.8)] disabled:opacity-75 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-500/60 text-red-300 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-950/90 border border-emerald-400 text-emerald-300 text-xs flex items-center gap-2 animate-bounce">
              <span>✓</span>
              <span>Action Plan saved successfully!</span>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-emerald-500/30">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer uppercase tracking-wider ${
                !isAdmin
                  ? 'bg-amber-600 hover:bg-amber-500 text-black'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-50'
              }`}
            >
              {saving
                ? 'Saving Plan…'
                : !isAdmin
                ? '🔒 Unlock Admin to Save'
                : 'Save Action Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
