// ============================================================
// FL Part Grouping Chart Component
// ------------------------------------------------------------
// Visualizes Front Load (FL) Part Replacements with Part Grouping
// on the X-axis with 0-3 Month Ageing Breakdown.
// Engineered for presentation / TV Showcase mode.
// ============================================================

import { memo, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useAdmin } from '../context/AdminContext';
import { useTheme } from '../context/ThemeContext';

function FLPartGroupingChart({ partGroups = [], flTotal = 0, activeDate = '', isCompact = false, isVisible = true }) {
  const { isAdmin } = useAdmin();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const chartComponentRef = useRef(null);
  const containerRef = useRef(null);

  // Display only top 5 part groups (highest replacement counts)
  const allGroups = useMemo(() => (partGroups || []).slice(0, 5), [partGroups]);
  const isZero = allGroups.length === 0;

  // Theme colors
  const textColor = isAdmin ? '#4ade80' : isDark ? '#F1F5F9' : '#0F172A';
  const subTextColor = isAdmin ? '#22c55e' : isDark ? '#94A3B8' : '#64748B';
  const lineColor = isAdmin ? 'rgba(34, 197, 94, 0.4)' : isDark ? '#1E2D4A' : '#D3DCE8';
  const gridColor = isAdmin ? 'rgba(34, 197, 94, 0.15)' : isDark ? 'rgba(30, 45, 74, 0.6)' : '#E7ECF3';
  const tooltipBg = isAdmin ? '#050505' : isDark ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = isAdmin ? '#22c55e' : isDark ? '#334155' : '#CBD5E1';

  // Ageing series color: Bright Light Sky Blue (#38BDF8)
  const BAR_COLOR = '#38BDF8';

  const categories = useMemo(() => allGroups.map((g) => g.partName), [allGroups]);

  // Series: Only 0-3 Months across Top 5 Part Names
  const seriesData = useMemo(() => [
    {
      name: '0-3 Months',
      data: allGroups.map((g) => ({
        name: g.partName,
        y: g.count || g.ageing?.months0_3 || 0,
        color: BAR_COLOR,
      })),
      color: BAR_COLOR,
    },
  ], [allGroups]);

  // Chart options
  const chartOptions = useMemo(() => ({
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      animation: false,
      style: { fontFamily: isAdmin ? '"JetBrains Mono", monospace' : 'Inter, system-ui, sans-serif' },
      spacingTop: 12,
      spacingBottom: 42,
      spacingLeft: 12,
      spacingRight: 12,
      reflow: true,
    },
    title: { text: null },
    credits: { enabled: false },
    xAxis: {
      categories: categories.length > 0 ? categories : ['No Parts Data'],
      lineColor,
      margin: 16,
      labels: {
        rotation: -15,
        align: 'right',
        step: 1,
        reserveSpace: true,
        y: 14,
        x: -4,
        padding: 8,
        style: {
          color: textColor,
          fontSize: '11px',
          fontWeight: '700',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
        formatter: function () {
          const val = String(this.value || '');
          const maxLen = 24;
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
      labels: { style: { color: subTextColor, fontSize: '10.5px', fontWeight: '600' } },
      allowDecimals: false,
      min: 0,
      maxPadding: 0.15,
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
          <div style="padding: 3px 6px;">
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
        const pct = flTotal > 0 ? ((total / flTotal) * 100).toFixed(1) : '0.0';
        s += `
            <div style="border-top: 1px solid ${lineColor}; margin-top: 4px; padding-top: 3px; display: flex; justify-content: space-between; gap: 14px; font-weight: 700;">
              <span>Total 0-3M FL Replacements:</span>
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
        animation: false,
        borderRadius: 6,
        pointPadding: 0.12,
        groupPadding: 0.08,
        maxPointWidth: 65,
        minPointLength: 4,
        dataLabels: {
          enabled: true,
          inside: false,
          verticalAlign: 'top',
          y: -4,
          crop: false,
          overflow: 'none',
          style: {
            color: textColor,
            fontSize: '11.5px',
            fontWeight: '800',
            textOutline: 'none',
          },
          formatter: function () {
            return this.y > 0 ? this.y : '';
          },
        },
      },
    },
    series: seriesData,
  }), [categories, isAdmin, lineColor, gridColor, textColor, subTextColor, tooltipBg, tooltipBorder, flTotal, seriesData]);

  // Ensure responsive reflow on resize, slide visibility change, and data updates
  useEffect(() => {
    const handleReflow = () => {
      if (chartComponentRef.current?.chart) {
        chartComponentRef.current.chart.reflow();
      }
    };

    if (isVisible) {
      handleReflow();
      const t1 = setTimeout(handleReflow, 50);
      const t2 = setTimeout(handleReflow, 200);
      const t3 = setTimeout(handleReflow, 500);

      let observer = null;
      if (containerRef.current) {
        observer = new ResizeObserver(() => {
          handleReflow();
        });
        observer.observe(containerRef.current);
      }

      return () => {
        if (observer) observer.disconnect();
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isVisible, allGroups, isZero]);

  const topPart = allGroups[0] || null;

  return (
    <div className="panel p-2.5 lg:p-3 flex flex-col h-full w-full min-h-[360px] border-t-4 border-t-sky-500 shadow-panel relative">
      {/* Sleek Integrated Header & KPI Bar */}
      <div className="flex flex-col gap-1 shrink-0 mb-1.5">
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          {/* Title & Badge */}
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-500 font-bold text-[11px]">
              FL
            </div>
            <h3 className="font-display text-xs lg:text-sm font-bold text-ink-950 dark:text-mist-100 flex items-center gap-1">
              FL Top 5 Part Replacements (0-3M)
            </h3>
          </div>

          {/* Inline KPI Metric Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-[11px]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">Total:</span>
              <strong className="font-display font-black text-sky-950 dark:text-sky-200">{flTotal.toLocaleString()}</strong>
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-mist-100 dark:bg-ink-800/60 border border-mist-200 dark:border-ink-700/60 text-[11px]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-ink-600 dark:text-mist-400">Top Groups:</span>
              <strong className="font-display font-black text-ink-950 dark:text-mist-100">{allGroups.length}</strong>
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

        {/* Ageing Breakdown Banner - Focused 0-3 Months */}
        {!isZero && (
          <div className="flex items-center justify-between gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 dark:bg-sky-950/40 border border-sky-500/30 text-[9.5px]">
            <span className="flex items-center gap-1.5 font-bold text-sky-700 dark:text-sky-300">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              Ageing Range: <strong className="font-black uppercase tracking-wide text-sky-600 dark:text-sky-300">0-3 Months</strong>
            </span>
            <span className="font-mono font-bold text-sky-800 dark:text-sky-200">
              {flTotal.toLocaleString()} FL Part Replacements
            </span>
          </div>
        )}
      </div>

      {/* Content Canvas / Zero State */}
      <div ref={containerRef} className="flex-1 w-full min-h-[260px] flex flex-col relative">
        {isZero ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-center p-4 bg-mist-50/60 dark:bg-ink-950/40 rounded-xl border border-dashed border-sky-300 dark:border-sky-900/60">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/80 border border-sky-300 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-1.5 text-base">
              ⚙️
            </div>
            <h4 className="font-display text-xs font-bold text-ink-900 dark:text-mist-100">
              Awaiting FL Dataset Upload
            </h4>
            <p className="text-[11px] text-ink-500 dark:text-mist-400 max-w-xs mt-0.5 mb-2">
              Currently, no FL part replacement data is found for this date.
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 rounded-lg transition-all cursor-pointer shadow-xs"
            >
              Upload FL Dataset
            </button>
          </div>
        ) : (
          <div className="w-full h-full min-h-[260px] flex-1 flex flex-col">
            <HighchartsReact
              ref={chartComponentRef}
              highcharts={Highcharts}
              options={chartOptions}
              containerProps={{
                style: { width: '100%', height: '100%', minHeight: '260px', flex: 1 },
                className: 'w-full h-full min-h-[260px] flex-1'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(FLPartGroupingChart);

