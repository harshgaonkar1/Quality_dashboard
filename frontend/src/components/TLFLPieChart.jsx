// ============================================================
// TL & FL Pie Chart Component
// ------------------------------------------------------------
// Renders an interactive Highcharts Pie Chart displaying the
// distribution of Top Load (TL) vs Front Load (FL) product
// replacements, along with summary cards and bucket breakdowns.
// Engineered to fit 100% inside a single viewport frame.
// ============================================================

import { useEffect, useRef } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useAdmin } from '../context/AdminContext';
import { useTheme } from '../context/ThemeContext';
import { formatDate } from '../utils/formatDate';

export default function TLFLPieChart({ total = 0, tlCount = 0, flCount = 0, cards = [], activeDate = '' }) {
  const { isAdmin } = useAdmin();
  const { isDark } = useTheme();

  // Track initial animation state: animates ONLY on initial load/data change, never on slide toggle
  const isFirstRender = useRef(true);

  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  const tlPercent = total > 0 ? ((tlCount / total) * 100).toFixed(1) : '0.0';
  const flPercent = total > 0 ? ((flCount / total) * 100).toFixed(1) : '0.0';

  const textColor = isAdmin ? '#4ade80' : isDark ? '#F1F5F9' : '#0F172A';
  const subTextColor = isAdmin ? '#22c55e' : isDark ? '#94A3B8' : '#64748B';
  const flColor = isAdmin ? '#38BDF8' : isDark ? '#38BDF8' : '#2563EB';
  const tlColor = isAdmin ? '#F43F5E' : isDark ? '#FB7185' : '#E11D48';
  const tooltipBg = isAdmin ? '#050505' : isDark ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = isAdmin ? '#22c55e' : isDark ? '#334155' : '#CBD5E1';

  const mainPieOptions = {
    chart: {
      type: 'pie',
      backgroundColor: 'transparent',
      style: { fontFamily: isAdmin ? '"JetBrains Mono", monospace' : 'Inter, system-ui, sans-serif' },
      height: 210,
      animation: isFirstRender.current ? { duration: 800 } : false,
      margin: [0, 0, 0, 0],
    },
    title: { text: null },
    credits: { enabled: false },
    tooltip: {
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      borderRadius: 8,
      shadow: true,
      style: { color: textColor, fontSize: '11px' },
      useHTML: true,
      formatter: function () {
        return `
          <div style="padding: 2px 4px;">
            <div style="font-weight: 700; color: ${this.point.color}; font-size: 12px; margin-bottom: 2px;">
              ● ${this.point.name}
            </div>
            <div style="display: flex; justify-content: space-between; gap: 10px; font-size: 11px;">
              <span>Replacements:</span>
              <span style="font-weight: 700;">${this.y.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 10px; font-size: 11px; margin-top: 1px;">
              <span>Share:</span>
              <span style="font-weight: 700;">${this.percentage.toFixed(1)}%</span>
            </div>
          </div>
        `;
      },
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        innerSize: '55%',
        borderWidth: 2,
        borderColor: isDark || isAdmin ? '#0F172A' : '#FFFFFF',
        animation: isFirstRender.current ? { duration: 800 } : false,
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b><br/>{point.y:.0f} ({point.percentage:.1f}%)',
          style: {
            color: textColor,
            fontSize: '10px',
            fontWeight: '700',
            textOutline: 'none',
          },
          connectorColor: subTextColor,
          distance: 12,
        },
      },
    },
    series: [
      {
        name: 'Product Category',
        colorByPoint: false,
        data: [
          {
            name: 'TL (Top Load)',
            y: tlCount,
            color: tlColor,
            sliced: true,
            selected: true,
          },
          {
            name: 'FL (Front Load)',
            y: flCount,
            color: flColor,
          },
        ],
      },
    ],
  };

  return (
    <div className="flex flex-col justify-between h-full space-y-2.5">
      {/* 3 Summary Stat Cards */}
      <div className="grid grid-cols-3 gap-2.5 shrink-0">
        {/* Total Box */}
        <div className={`p-2.5 lg:p-3 rounded-xl border transition-all flex items-center justify-between ${isAdmin
          ? 'bg-neutral-950 border-green-500/40 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.1)]'
          : 'bg-white dark:bg-ink-900 border-mist-300 dark:border-ink-800 shadow-2xs'
          }`}>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-ink-500 dark:text-mist-400 block">
              Total Replacements
            </span>
            <p className="text-xl lg:text-2xl font-extrabold font-display tracking-tight text-ink-950 dark:text-white mt-0.5">
              {total.toLocaleString()}
            </p>
          </div>
          <span className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-mist-200/80 dark:bg-ink-800 flex items-center justify-center text-sm shrink-0">
            📦
          </span>
        </div>

        {/* TL Box */}
        <div className={`p-2.5 lg:p-3 rounded-xl border transition-all flex items-center justify-between ${isAdmin
          ? 'bg-neutral-950 border-rose-500/40 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.1)]'
          : 'bg-white dark:bg-ink-900 border-rose-200 dark:border-rose-900/40 shadow-2xs'
          }`}>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                TL Models (Top Load)
              </span>
            </div>
            <p className="text-xl lg:text-2xl font-extrabold font-display tracking-tight text-rose-600 dark:text-rose-400 mt-0.5">
              {tlCount.toLocaleString()}
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
            {tlPercent}%
          </span>
        </div>

        {/* FL Box */}
        <div className={`p-2.5 lg:p-3 rounded-xl border transition-all flex items-center justify-between ${isAdmin
          ? 'bg-neutral-950 border-sky-500/40 text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.1)]'
          : 'bg-white dark:bg-ink-900 border-sky-200 dark:border-sky-900/40 shadow-2xs'
          }`}>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
                FL Models (Front Load)
              </span>
            </div>
            <p className="text-xl lg:text-2xl font-extrabold font-display tracking-tight text-sky-600 dark:text-sky-400 mt-0.5">
              {flCount.toLocaleString()}
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0">
            {flPercent}%
          </span>
        </div>
      </div>

      {/* Side-by-Side Main Split Panels */}
      <div className="grid grid-cols-12 gap-2.5 items-stretch flex-1 min-h-0">
        {/* Left Box: Pie Chart (5 cols) */}
        <div className={`col-span-5 p-3.5 rounded-xl border flex flex-col justify-between transition-all overflow-hidden ${isAdmin
          ? 'bg-neutral-950 border-green-500/30'
          : 'bg-white dark:bg-ink-900 border-mist-300 dark:border-ink-800 shadow-2xs'
          }`}>
          <div className="flex items-center justify-between pb-1.5 border-b border-mist-200 dark:border-ink-800 shrink-0">
            <h3 className="text-xs font-extrabold text-ink-950 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
              <span>🥧</span> Product Share
            </h3>
            <span className="text-[11px] font-extrabold text-signal-dark dark:text-signal bg-signal/15 px-2 py-0.5 rounded border border-signal/30">
              {activeDate ? `Date: ${formatDate(activeDate)}` : 'Single Day'}
            </span>
          </div>

          {total === 0 ? (
            <div className="py-8 text-center text-ink-400 dark:text-ink-500 text-xs my-auto">
              No replacement data for selected day
            </div>
          ) : (
            <div className="my-auto py-0.5 flex items-center justify-center">
              <HighchartsReact highcharts={Highcharts} options={mainPieOptions} />
            </div>
          )}
        </div>

        {/* Right Box: FL & TL Damage Type Summary (7 cols) */}
        <div className={`col-span-7 p-3.5 rounded-xl border flex flex-col justify-between transition-all overflow-hidden ${isAdmin
          ? 'bg-neutral-950 border-green-500/30'
          : 'bg-white dark:bg-ink-900 border-mist-300 dark:border-ink-800 shadow-2xs'
          }`}>
          <div className="flex items-center justify-between pb-2 border-b border-mist-200 dark:border-ink-800 mb-2 shrink-0">
            <h4 className="text-xs font-extrabold text-ink-950 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
              <span>📊</span> Damage Type Breakdown
            </h4>
            <span className="text-[11px] text-ink-500 dark:text-mist-400 font-bold">Functional vs Transit</span>
          </div>

          <div className="grid grid-cols-2 gap-4 my-auto h-full items-center py-1">
            {/* TL Column */}
            <div className="bg-rose-50/70 dark:bg-rose-950/40 p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 flex flex-col justify-between space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-rose-200 dark:border-rose-900/50 pb-2">
                <span className="text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                  TL (Top Load)
                </span>
                <span className="text-xs font-black text-rose-700 dark:text-rose-300 bg-rose-200/80 dark:bg-rose-900/60 px-2 py-0.5 rounded-full">
                  Total: {tlCount}
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="p-2.5 rounded-lg bg-white/80 dark:bg-ink-900/80 border border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span className="text-xs font-bold text-ink-800 dark:text-mist-100">Functional</span>
                  </div>
                  <span className="text-base font-black text-rose-600 dark:text-rose-400">
                    {cards.reduce((sum, c) => sum + (c.tlFunc || 0), 0)}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white/80 dark:bg-ink-900/80 border border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-xs font-bold text-ink-800 dark:text-mist-100">Transit</span>
                  </div>
                  <span className="text-base font-black text-amber-600 dark:text-amber-400">
                    {cards.reduce((sum, c) => sum + (c.tlTrans || 0), 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* FL Column */}
            <div className="bg-sky-50/70 dark:bg-sky-950/40 p-4 rounded-xl border border-sky-200 dark:border-sky-900/50 flex flex-col justify-between space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-sky-200 dark:border-sky-900/50 pb-2">
                <span className="text-sm font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                  FL (Front Load)
                </span>
                <span className="text-xs font-black text-sky-700 dark:text-sky-300 bg-sky-200/80 dark:bg-sky-900/60 px-2 py-0.5 rounded-full">
                  Total: {flCount}
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="p-2.5 rounded-lg bg-white/80 dark:bg-ink-900/80 border border-sky-100 dark:border-sky-900/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                    <span className="text-xs font-bold text-ink-800 dark:text-mist-100">Functional</span>
                  </div>
                  <span className="text-base font-black text-sky-600 dark:text-sky-400">
                    {cards.reduce((sum, c) => sum + (c.flFunc || 0), 0)}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white/80 dark:bg-ink-900/80 border border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-xs font-bold text-ink-800 dark:text-mist-100">Transit</span>
                  </div>
                  <span className="text-base font-black text-amber-600 dark:text-amber-400">
                    {cards.reduce((sum, c) => sum + (c.flTrans || 0), 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
