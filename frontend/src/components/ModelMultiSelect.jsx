// ============================================================
// Model Multi-Select Filter Component
// ------------------------------------------------------------
// Enables selecting multiple machine model types (TL, FL, MW).
// Supports select all, individual checkboxes, quick clear,
// and displays active selection badges with smooth UX.
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_OPTIONS = [
  { value: 'TL', label: 'TL Models', desc: 'Top Load', badge: 'TL', color: 'rose' },
  { value: 'FL', label: 'FL Models', desc: 'Front Load', badge: 'FL', color: 'sky' },
  { value: 'MW', label: 'MW Models', desc: 'Microwave', badge: 'MW', color: 'amber' },
];

export default function ModelMultiSelect({
  value = '',
  onChange,
  label = 'Model Type',
  options = DEFAULT_OPTIONS,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse current value (comma-separated string or array) into array of active values
  const selectedValues = useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((v) => String(v).trim().toUpperCase()).filter(Boolean);
    return String(value)
      .split(',')
      .map((v) => v.trim().toUpperCase())
      .filter(Boolean);
  }, [value]);

  const isAllSelected = selectedValues.length === 0 || selectedValues.length === options.length;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Toggle single option
  const handleToggleOption = (optVal) => {
    let newSelected;
    if (isAllSelected) {
      // If currently all selected and clicking one, only select that one
      newSelected = [optVal];
    } else if (selectedValues.includes(optVal)) {
      newSelected = selectedValues.filter((v) => v !== optVal);
    } else {
      newSelected = [...selectedValues, optVal];
    }

    // If all options selected or none selected, represent as '' (All Models)
    if (newSelected.length === 0 || newSelected.length === options.length) {
      onChange?.('');
    } else {
      onChange?.(newSelected.join(','));
    }
  };

  // Toggle All / Clear All
  const handleToggleAll = () => {
    if (isAllSelected) {
      // Clear all
      onChange?.('');
    } else {
      // Select all (empty string represents all)
      onChange?.('');
    }
  };

  // Quick reset
  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.('');
  };

  const getBadgeColor = (color) => {
    switch (color) {
      case 'rose':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'sky':
        return 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      case 'amber':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-mist-200 dark:bg-ink-800 text-ink-800 dark:text-mist-200 border-mist-300 dark:border-ink-700';
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 bg-white dark:bg-ink-900 border border-mist-200 dark:border-ink-800 hover:border-mist-300 dark:hover:border-ink-700 rounded-lg px-2.5 py-1.5 shadow-xs transition-all cursor-pointer select-none text-left"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-xs font-semibold text-ink-500 dark:text-mist-400 whitespace-nowrap">
          {label}:
        </span>

        {/* Display Current Selection Summary */}
        <div className="flex items-center gap-1">
          {isAllSelected ? (
            <span className="text-xs font-semibold text-ink-900 dark:text-mist-100">
              All Models
            </span>
          ) : (
            <div className="flex items-center gap-1">
              {selectedValues.map((val) => {
                const opt = options.find((o) => o.value === val);
                return (
                  <span
                    key={val}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${getBadgeColor(
                      opt?.color
                    )}`}
                  >
                    {opt?.badge || val}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Clear Button if subset selected */}
        {!isAllSelected && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            className="w-3.5 h-3.5 rounded-full hover:bg-mist-200 dark:hover:bg-ink-700 flex items-center justify-center text-[10px] text-ink-400 dark:text-mist-400 hover:text-ink-800 dark:hover:text-mist-100 transition-colors ml-0.5"
            title="Reset to all models"
          >
            ✕
          </span>
        )}

        {/* Chevron Icon */}
        <svg
          className={`w-3.5 h-3.5 text-ink-400 dark:text-mist-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-signal-dark dark:text-signal' : ''
          }`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 w-56 p-2 rounded-xl bg-white dark:bg-ink-900 border border-mist-300 dark:border-ink-700 shadow-xl space-y-1 font-sans animate-in fade-in zoom-in-95 duration-100">
          {/* Header & Quick Actions */}
          <div className="flex items-center justify-between px-1.5 py-1 border-b border-mist-200 dark:border-ink-800 text-[10px] font-extrabold uppercase tracking-wider text-ink-400 dark:text-mist-400">
            <span>Filter by Model</span>
            <button
              type="button"
              onClick={handleToggleAll}
              className="text-signal-dark dark:text-signal hover:underline cursor-pointer lowercase first-letter:uppercase"
            >
              {isAllSelected ? 'select all' : 'reset all'}
            </button>
          </div>

          {/* Option: All Models */}
          <div
            onClick={handleToggleAll}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-mist-100 dark:hover:bg-ink-800 transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                  isAllSelected
                    ? 'bg-signal border-signal text-ink-950 font-bold'
                    : 'border-mist-300 dark:border-ink-700 bg-white dark:bg-ink-950'
                }`}
              >
                {isAllSelected && (
                  <svg className="w-3 h-3 stroke-current stroke-2" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-xs font-semibold text-ink-900 dark:text-mist-100">
                All Models
              </span>
            </div>
            <span className="text-[10px] font-medium text-ink-400 dark:text-mist-400">
              (TL, FL, MW)
            </span>
          </div>

          {/* Individual Model Options */}
          {options.map((opt) => {
            const isChecked = !isAllSelected && selectedValues.includes(opt.value);
            return (
              <div
                key={opt.value}
                onClick={() => handleToggleOption(opt.value)}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-mist-100 dark:hover:bg-ink-800 transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                      isChecked
                        ? 'bg-signal border-signal text-ink-950 font-bold'
                        : 'border-mist-300 dark:border-ink-700 bg-white dark:bg-ink-950'
                    }`}
                  >
                    {isChecked && (
                      <svg className="w-3 h-3 stroke-current stroke-2" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-medium text-ink-900 dark:text-mist-100">
                    {opt.label}
                  </span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${getBadgeColor(
                    opt.color
                  )}`}
                >
                  {opt.badge}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
