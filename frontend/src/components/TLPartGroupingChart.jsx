// ============================================================
// TL Part Grouping Chart Component
// ------------------------------------------------------------
// Visualizes Top Load (TL) Part Replacements with Part Grouping
// on the X-axis with Stacked Ageing Breakdown.
// Engineered for presentation / TV Showcase mode.
// ============================================================

import { memo, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useAdmin } from '../context/AdminContext';
import { useTheme } from '../context/ThemeContext';

function TLPartGroupingChart({ partGroups = [], tlTotal = 0, activeDate = '', isCompact = false }) {
  const { isAdmin } = useAdmin();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const chartComponentRef = useRef(null);
  const containerRef = useRef(null);

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

  // Ageing series colors:
  // 0day = Bright Orange, 0-3M = Light Mint Green, 1Y = Bright Electric Red, 2Y = Bright Cyan Blue, 3Y = Bright Sunshine Yellow, 4Y = Bright Electric Violet, >4Y = Bright Royal Indigo
  const AGEING_COLORS = {
    installFailure: isAdmin ? '#FFA040' : '#FF7A00', // Bright Radiant Orange
    months0_3: isAdmin ? '#86EFAC' : '#4ADE80',      // Light Mint Green
    year1: isAdmin ? '#FF6B7D' : '#FF334B',          // Bright Electric Red
    year2: isAdmin ? '#40C8FF' : '#00B4FF',          // Bright Electric Sky Blue
    year3: isAdmin ? '#FFF04D' : '#FFDE00',          // Bright Sunshine Yellow
    year4: isAdmin ? '#D166FF' : '#B845FF',          // Bright Electric Violet / Purple
    moreThan4: isAdmin ? '#807DFF' : '#4F46E5',      // Bright Royal Indigo
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
      height: null,
      spacingTop: 6,
      spacingBottom: 24,
      spacingLeft: 8,
      spacingRight: 8,
      reflow: true,
    },
    title: { text: null },
    credits: { enabled: false },
    xAxis: {
      categories: categories.length > 0 ? categories : ['No Parts Data'],
      lineColor,
      labels: {
        rotation: categories.length > 6 ? -50 : -25,
        align: 'right',
        step: 1,
        reserveSpace: true,
        y: 4,
        x: -2,
        style: {
          color: textColor,
          fontSize: categories.length > 20 ? '9px' : categories.length > 12 ? '10px' : '11px',
          fontWeight: '600',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
        formatter: function () {
          const val = String(this.value || '');
          const maxLen = categories.length > 15 ? 18 : 22;
          if (val.length > maxLen) {
            return val.slice(0, maxLen - 1) + '…';
          }
          return val;
        },
      },
    },
    yAxis: {
      title: { text: null },
      gridLineColor: gridColor,
      labels: { style: { color: subTextColor, fontSize: '10px', fontWeight: '600' } },
      allowDecimals: false,
      min: 0,
      stackLabels: {
        enabled: true,
        style: {
          fontWeight: 'bold',
          color: textColor,
          fontSize: '10px',
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
        pointPadding: categories.length > 15 ? 0.05 : 0.1,
        groupPadding: categories.length > 15 ? 0.02 : 0.05,
        maxPointWidth: 55,
      },
    },
    series: stackedSeries,
  }), [categories, isAdmin, lineColor, gridColor, textColor, subTextColor, tooltipBg, tooltipBorder, tlTotal, stackedSeries]);

  // Ensure responsive reflow on resize and data updates
  useEffect(() => {
    if (!containerRef.current) return;
    const handleReflow = () => {
      if (chartComponentRef.current?.chart) {
        chartComponentRef.current.chart.reflow();
      }
    };

    handleReflow();
    const t1 = setTimeout(handleReflow, 60);
    const t2 = setTimeout(handleReflow, 250);

    const observer = new ResizeObserver(() => {
      handleReflow();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [allGroups, isZero]);

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
    <div className="panel p-2 lg:p-2.5 flex flex-col h-full w-full min-h-0 border-t-4 border-t-rose-500 shadow-panel relative">
      {/* Sleek Integrated Header & KPI Bar */}
      <div className="flex flex-col gap-1 shrink-0 mb-1">
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          {/* Title & Badge */}
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 font-bold text-[11px]">
              TL
            </div>
            <h3 className="font-display text-xs lg:text-sm font-bold text-ink-950 dark:text-mist-100 flex items-center gap-1">
              TL Part Replacement
            </h3>
          </div>

          {/* Inline KPI Metric Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-[11px]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Total:</span>
              <strong className="font-display font-black text-rose-950 dark:text-rose-200">{tlTotal.toLocaleString()}</strong>
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-mist-100 dark:bg-ink-800/60 border border-mist-200 dark:border-ink-700/60 text-[11px]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-ink-600 dark:text-mist-400">Groups:</span>
              <strong className="font-display font-black text-ink-950 dark:text-mist-100">{partGroups.length}</strong>
            </div>
            {topPart && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-mist-100 dark:bg-ink-800/60 border border-mist-200 dark:border-ink-700/60 text-[11px] max-w-[220px] truncate" title={`${topPart.partName} (${topPart.count})`}>
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink-600 dark:text-mist-400 shrink-0">Top:</span>
                <span className="font-bold text-ink-900 dark:text-mist-100 truncate">{topPart.partName}</span>
                <span className="px-1 py-0.1 rounded font-mono font-bold bg-mist-200 dark:bg-ink-700 text-[9px] shrink-0">{topPart.count}</span>
              </div>
            )}
          </div>
        </div>

        {/* Ageing Breakdown Pills Legend */}
        {!isZero && (
          <div className="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded-md bg-mist-100/60 dark:bg-ink-900/60 border border-mist-200/80 dark:border-ink-800 text-[9px] overflow-x-auto">
            <span className="font-bold text-ink-500 dark:text-mist-400 uppercase tracking-wider text-[8px] shrink-0">
              Ageing:
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="flex items-center gap-0.5 px-1 py-0.1 rounded font-bold bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-400/30">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AGEING_COLORS.installFailure }} />
                0d: <strong className="font-mono">{ageingTotals.installFailure}</strong>
              </span>
              <span className="flex items-center gap-0.5 px-1 py-0.1 rounded font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AGEING_COLORS.months0_3 }} />
                0-3M: <strong className="font-mono">{ageingTotals.months0_3}</strong>
              </span>
              <span className="flex items-center gap-0.5 px-1 py-0.1 rounded font-bold bg-red-500/10 text-red-700 dark:text-red-300 border border-red-400/30">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AGEING_COLORS.year1 }} />
                1Y: <strong className="font-mono">{ageingTotals.year1}</strong>
              </span>
              <span className="flex items-center gap-0.5 px-1 py-0.1 rounded font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-400/30">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AGEING_COLORS.year2 }} />
                2Y: <strong className="font-mono">{ageingTotals.year2}</strong>
              </span>
              <span className="flex items-center gap-0.5 px-1 py-0.1 rounded font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AGEING_COLORS.year3 }} />
                3Y: <strong className="font-mono">{ageingTotals.year3}</strong>
              </span>
              <span className="flex items-center gap-0.5 px-1 py-0.1 rounded font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-400/30">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AGEING_COLORS.year4 }} />
                4Y: <strong className="font-mono">{ageingTotals.year4}</strong>
              </span>
              <span className="flex items-center gap-0.5 px-1 py-0.1 rounded font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-400/30">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AGEING_COLORS.moreThan4 }} />
                &gt;4Y: <strong className="font-mono">{ageingTotals.moreThan4}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content Canvas / Zero State */}
      <div ref={containerRef} className="flex-1 min-h-0 w-full relative">
        {isZero ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-mist-50/60 dark:bg-ink-950/40 rounded-xl border border-dashed border-rose-300 dark:border-rose-900/60">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-1.5 text-base">
              ⚙️
            </div>
            <h4 className="font-display text-xs font-bold text-ink-900 dark:text-mist-100">
              Awaiting TL Dataset Upload
            </h4>
            <p className="text-[11px] text-ink-500 dark:text-mist-400 max-w-xs mt-0.5 mb-2">
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
          <div className="w-full h-full absolute inset-0">
            <HighchartsReact
              ref={chartComponentRef}
              highcharts={Highcharts}
              options={stackedOptions}
              containerProps={{
                style: { width: '100%', height: '100%', position: 'absolute', inset: 0 },
                className: 'w-full h-full'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(TLPartGroupingChart);
