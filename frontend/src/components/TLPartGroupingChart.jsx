// ============================================================
// TL Part Grouping Chart Component
// ------------------------------------------------------------
// Visualizes Top Load (TL) Part Replacements with Part Grouping
// on the X-axis with Stacked Ageing Breakdown.
// Engineered for presentation / TV Showcase mode.
// ============================================================

import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useAdmin } from '../context/AdminContext';
import { useTheme } from '../context/ThemeContext';

function TLPartGroupingChart({ partGroups = [], tlTotal = 0, activeDate = '', isCompact = false }) {
  const { isAdmin } = useAdmin();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  // Display all part groups so bar graph counts match total replacements
  const allGroups = useMemo(() => partGroups || [], [partGroups]);
  const isZero = tlTotal === 0 || allGroups.length === 0;

  // Theme colors
  const textColor = isAdmin ? '#4ade80' : isDark ? '#F1F5F9' : '#0F172A';
  const subTextColor = isAdmin ? '#22c55e' : isDark ? '#94A3B8' : '#64748B';
  const lineColor = isAdmin ? 'rgba(34, 197, 94, 0.4)' : isDark ? '#1E2D4A' : '#D3DCE8';
  const gridColor = isAdmin ? 'rgba(34, 197, 94, 0.15)' : isDark ? 'rgba(30, 45, 74, 0.6)' : '#E7ECF3';
  const tooltipBg = isAdmin ? '#050505' : isDark ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = isAdmin ? '#22c55e' : isDark ? '#334155' : '#CBD5E1';

  // Ageing series colors (Rose / Crimson hues for TL)
  const AGEING_COLORS = {
    installFailure: isAdmin ? '#86efac' : '#E11D48',
    months0_3: isAdmin ? '#4ade80' : '#F43F5E',
    year1: isAdmin ? '#22c55e' : '#FB7185',
    year2: isAdmin ? '#16a34a' : '#FDA4AF',
    year3: isAdmin ? '#15803d' : '#BE123C',
    year4: isAdmin ? '#166534' : '#9F1239',
    moreThan4: isAdmin ? '#14532d' : '#881337',
  };

  const categories = useMemo(() => allGroups.map((g) => g.partName), [allGroups]);

  // Stacked Series: Breakdown by Ageing Bucket across all Part Names
  const stackedSeries = useMemo(() => [
    {
      name: 'Install Failure (0d)',
      data: allGroups.map((g) => g.ageing?.installFailure || 0),
      color: AGEING_COLORS.installFailure,
    },
    {
      name: '0-3 Months',
      data: allGroups.map((g) => g.ageing?.months0_3 || 0),
      color: AGEING_COLORS.months0_3,
    },
    {
      name: '1 Year',
      data: allGroups.map((g) => g.ageing?.year1 || 0),
      color: AGEING_COLORS.year1,
    },
    {
      name: '2 Year',
      data: allGroups.map((g) => g.ageing?.year2 || 0),
      color: AGEING_COLORS.year2,
    },
    {
      name: '3 Year',
      data: allGroups.map((g) => g.ageing?.year3 || 0),
      color: AGEING_COLORS.year3,
    },
    {
      name: '4 Year',
      data: allGroups.map((g) => g.ageing?.year4 || 0),
      color: AGEING_COLORS.year4,
    },
    {
      name: '> 4 Years',
      data: allGroups.map((g) => g.ageing?.moreThan4 || 0),
      color: AGEING_COLORS.moreThan4,
    },
  ], [allGroups, AGEING_COLORS]);

  const stackedOptions = useMemo(() => ({
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      animation: false,
      style: { fontFamily: isAdmin ? '"JetBrains Mono", monospace' : 'Inter, system-ui, sans-serif' },
      height: isCompact ? 350 : 390,
      spacingBottom: 15,
    },
    title: { text: null },
    credits: { enabled: false },
    xAxis: {
      categories: categories.length > 0 ? categories : ['No Parts Data'],
      lineColor,
      labels: {
        rotation: -45,
        align: 'right',
        step: 1,
        reserveSpace: true,
        style: {
          color: textColor,
          fontSize: categories.length > 18 ? '9px' : categories.length > 12 ? '10px' : '11px',
          fontWeight: '700',
          textOverflow: 'none',
          whiteSpace: 'nowrap',
        },
        formatter: function () {
          return this.value;
        },
      },
    },
    yAxis: {
      title: { text: null },
      gridLineColor: gridColor,
      labels: { style: { color: subTextColor, fontSize: '11px' } },
      allowDecimals: false,
      stackLabels: {
        enabled: true,
        style: {
          fontWeight: 'bold',
          color: textColor,
          fontSize: '11px',
          textOutline: 'none',
        },
        formatter: function () {
          return this.total > 0 ? this.total : '';
        },
      },
    },
    legend: {
      enabled: false,
    },
    tooltip: {
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      borderRadius: 8,
      shared: true,
      useHTML: true,
      style: { color: textColor, fontSize: '11px' },
      formatter: function () {
        let s = `
          <div style="padding: 2px 4px;">
            <div style="font-weight: 700; font-size: 12px; margin-bottom: 4px; color: ${textColor}">
              Part: ${this.x}
            </div>
        `;
        let total = 0;
        this.points.forEach((p) => {
          if (p.y > 0) {
            s += `
              <div style="display: flex; justify-content: space-between; gap: 14px; margin-bottom: 2px;">
                <span style="color: ${p.color}; font-weight: 600;">● ${p.series.name}:</span>
                <span style="font-weight: 700;">${p.y.toLocaleString()}</span>
              </div>
            `;
            total += p.y;
          }
        });
        const pct = tlTotal > 0 ? ((total / tlTotal) * 100).toFixed(1) : '0.0';
        s += `
            <div style="border-top: 1px solid ${lineColor}; margin-top: 4px; padding-top: 3px; display: flex; justify-content: space-between; gap: 14px; font-weight: 700;">
              <span>Total TL Replacements:</span>
              <span>${total.toLocaleString()} (${pct}%)</span>
            </div>
          </div>
        `;
        return s;
      },
    },
    plotOptions: {
      series: {
        animation: false,
      },
      column: {
        stacking: 'normal',
        animation: false,
        borderRadius: 4,
        pointPadding: 0.1,
        groupPadding: 0.05,
      },
    },
    series: stackedSeries,
  }), [categories, isCompact, isAdmin, lineColor, gridColor, textColor, subTextColor, tooltipBg, tooltipBorder, tlTotal, stackedSeries]);

  const ageingTotals = useMemo(() => {
    const totals = {
      installFailure: 0,
      months0_3: 0,
      year1: 0,
      year2: 0,
      year3: 0,
      year4: 0,
      moreThan4: 0,
    };
    (partGroups || []).forEach((g) => {
      if (g.ageing) {
        totals.installFailure += g.ageing.installFailure || 0;
        totals.months0_3 += g.ageing.months0_3 || 0;
        totals.year1 += g.ageing.year1 || 0;
        totals.year2 += g.ageing.year2 || 0;
        totals.year3 += g.ageing.year3 || 0;
        totals.year4 += g.ageing.year4 || 0;
        totals.moreThan4 += g.ageing.moreThan4 || 0;
      }
    });
    return totals;
  }, [partGroups]);

  const topPart = allGroups[0] || null;

  return (
    <div className="panel p-3 lg:p-4 flex flex-col justify-between border-t-4 border-t-rose-500 shadow-panel h-full relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 font-bold text-xs">
            TL
          </div>
          <div>
            <h3 className="font-display text-xs lg:text-sm font-bold text-ink-950 dark:text-mist-100 flex items-center gap-2">
              TL Part Replacement
            </h3>
          </div>
        </div>
      </div>

      {/* Mini KPI summary */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-lg p-2 text-center">
          <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
            Total TL Replacements
          </span>
          <span className="font-display text-base font-extrabold text-rose-900 dark:text-rose-200">
            {tlTotal.toLocaleString()}
          </span>
        </div>
        <div className="bg-mist-50 dark:bg-ink-800/40 border border-mist-200 dark:border-ink-700/60 rounded-lg p-2 text-center">
          <span className="text-[9px] font-bold uppercase tracking-wider text-ink-600 dark:text-mist-400 block">
            Distinct Part Groups
          </span>
          <span className="font-display text-base font-extrabold text-ink-900 dark:text-mist-100">
            {partGroups.length}
          </span>
        </div>
        <div className="bg-mist-50 dark:bg-ink-800/40 border border-mist-200 dark:border-ink-700/60 rounded-lg p-2 text-center">
          <span className="text-[9px] font-bold uppercase tracking-wider text-ink-600 dark:text-mist-400 block">
            Top Replaced Part
          </span>
          <span className="font-display text-xs font-bold text-ink-900 dark:text-mist-100 truncate block" title={topPart?.partName}>
            {topPart ? `${topPart.partName} (${topPart.count})` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Ageing Breakdown Summary at Top of Graph */}
      {!isZero && (
        <div className="flex flex-wrap items-center justify-between gap-1 px-2.5 py-1 rounded-lg bg-mist-100/70 dark:bg-ink-900/60 border border-mist-200 dark:border-ink-800 mb-2 text-[10px]">
          <span className="font-extrabold text-ink-600 dark:text-mist-400 uppercase tracking-wider text-[9px]">
            Ageing Breakdown:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-400/30">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AGEING_COLORS.installFailure }} />
              0d: <strong className="font-mono">{ageingTotals.installFailure}</strong>
            </span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-400/30">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AGEING_COLORS.months0_3 }} />
              0-3M: <strong className="font-mono">{ageingTotals.months0_3}</strong>
            </span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-400/30">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AGEING_COLORS.year1 }} />
              1Y: <strong className="font-mono">{ageingTotals.year1}</strong>
            </span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-400/30">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AGEING_COLORS.year2 }} />
              2Y: <strong className="font-mono">{ageingTotals.year2}</strong>
            </span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-400/30">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AGEING_COLORS.year3 }} />
              3Y: <strong className="font-mono">{ageingTotals.year3}</strong>
            </span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-400/30">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AGEING_COLORS.year4 }} />
              4Y: <strong className="font-mono">{ageingTotals.year4}</strong>
            </span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-400/30">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AGEING_COLORS.moreThan4 }} />
              &gt;4Y: <strong className="font-mono">{ageingTotals.moreThan4}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Content Canvas / Zero State */}
      <div className="flex-1 min-h-[250px] overflow-auto">
        {isZero ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-mist-50/60 dark:bg-ink-950/40 rounded-xl border border-dashed border-rose-300 dark:border-rose-900/60">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-2">
              ⚙️
            </div>
            <h4 className="font-display text-xs font-bold text-ink-900 dark:text-mist-100">
              Awaiting TL Dataset Upload
            </h4>
            <p className="text-[11px] text-ink-500 dark:text-mist-400 max-w-xs mt-1 mb-2.5">
              Currently, only FL part data is uploaded in the database for this date.
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-lg transition-all cursor-pointer shadow-xs"
            >
              Upload TL Dataset
            </button>
          </div>
        ) : (
          <HighchartsReact highcharts={Highcharts} options={stackedOptions} />
        )}
      </div>
    </div>
  );
}

export default memo(TLPartGroupingChart);
