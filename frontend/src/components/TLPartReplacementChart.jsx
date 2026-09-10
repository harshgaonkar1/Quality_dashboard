// ============================================================
// TL Part Replacement Chart Component (Graph 2)
// ------------------------------------------------------------
// Visualizes Top Load (TL) Part Replacement ageing distribution.
// Gracefully handles 0-count / empty state when only FL is in DB,
// with a clean status message, and seamlessly renders live bars
// as soon as TL data is uploaded.
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useAdmin } from '../context/AdminContext';
import { useTheme } from '../context/ThemeContext';

export default function TLPartReplacementChart({ cards = [], total = 0, tlCount = 0, activeDate = '' }) {
  const { isAdmin } = useAdmin();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [chartType, setChartType] = useState('column'); // 'column' | 'pie'

  // Colors
  const textColor = isAdmin ? '#4ade80' : isDark ? '#F1F5F9' : '#0F172A';
  const subTextColor = isAdmin ? '#22c55e' : isDark ? '#94A3B8' : '#64748B';
  const lineColor = isAdmin ? 'rgba(34, 197, 94, 0.4)' : isDark ? '#1E2D4A' : '#D3DCE8';
  const gridColor = isAdmin ? 'rgba(34, 197, 94, 0.15)' : isDark ? 'rgba(30, 45, 74, 0.6)' : '#E7ECF3';
  const tooltipBg = isAdmin ? '#050505' : isDark ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = isAdmin ? '#22c55e' : isDark ? '#334155' : '#CBD5E1';

  // Palette matching the bright vivid scheme: 0d Bright Orange, 0-3M Bright Green, 1Y Bright Red, 2Y Bright Blue, 3Y Bright Yellow, 4Y Bright Purple, >4Y Bright Indigo
  const tlBarColors = [
    isAdmin ? '#FFA040' : '#FF7A00', // Install Failure (0d) - Bright Orange
    isAdmin ? '#33FFA0' : '#00E676', // 0-3 Months - Bright Neon Emerald Green
    isAdmin ? '#FF6B7D' : '#FF334B', // 1 Year - Bright Electric Red
    isAdmin ? '#40C8FF' : '#00B4FF', // 2 Year - Bright Electric Sky Blue
    isAdmin ? '#FFF04D' : '#FFDE00', // 3 Year - Bright Sunshine Yellow
    isAdmin ? '#D166FF' : '#B845FF', // 4 Year - Bright Electric Violet
    isAdmin ? '#807DFF' : '#4F46E5', // > 4 Years - Bright Royal Indigo
  ];

  const categories = (cards || []).map((c) => c.label);
  const dataValues = (cards || []).map((c, i) => ({
    name: c.label,
    y: c.tlCount ?? 0,
    color: tlBarColors[i % tlBarColors.length],
  }));

  const totalTL = tlCount || dataValues.reduce((sum, d) => sum + d.y, 0);
  const isZero = totalTL === 0;

  const columnOptions = {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      style: { fontFamily: isAdmin ? '"JetBrains Mono", monospace' : 'Inter, system-ui, sans-serif' },
      height: 280,
    },
    title: { text: null },
    credits: { enabled: false },
    xAxis: {
      categories,
      lineColor,
      labels: {
        style: { color: subTextColor, fontSize: '11px', fontWeight: '600' },
        autoRotation: [-20, -40],
      },
    },
    yAxis: {
      title: { text: null },
      gridLineColor: gridColor,
      labels: { style: { color: subTextColor, fontSize: '11px' } },
      allowDecimals: false,
      min: 0,
      max: isZero ? 5 : undefined,
    },
    legend: { enabled: false },
    tooltip: {
      enabled: !isZero,
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      borderRadius: 8,
      shadow: true,
      style: { color: textColor, fontSize: '11px' },
      useHTML: true,
      formatter: function () {
        const pct = totalTL > 0 ? ((this.y / totalTL) * 100).toFixed(1) : '0.0';
        return `
          <div style="padding: 3px 6px;">
            <div style="font-weight: 700; color: ${this.point.color}; font-size: 12px; margin-bottom: 3px;">
              ● ${this.x}
            </div>
            <div style="display: flex; justify-content: space-between; gap: 14px; font-size: 11px;">
              <span>TL Replacements:</span>
              <span style="font-weight: 700;">${this.y.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 14px; font-size: 11px; margin-top: 2px;">
              <span>Share of TL:</span>
              <span style="font-weight: 700;">${pct}%</span>
            </div>
          </div>
        `;
      },
    },
    plotOptions: {
      column: {
        borderRadius: 4,
        pointPadding: 0.15,
        groupPadding: 0.1,
        dataLabels: {
          enabled: !isZero,
          style: {
            color: textColor,
            fontSize: '11px',
            fontWeight: '700',
            textOutline: 'none',
          },
        },
      },
    },
    series: [
      {
        name: 'TL Part Replacements',
        data: dataValues,
      },
    ],
  };

  const pieOptions = {
    chart: {
      type: 'pie',
      backgroundColor: 'transparent',
      style: { fontFamily: isAdmin ? '"JetBrains Mono", monospace' : 'Inter, system-ui, sans-serif' },
      height: 280,
    },
    title: { text: null },
    credits: { enabled: false },
    tooltip: {
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      borderRadius: 8,
      style: { color: textColor, fontSize: '11px' },
      useHTML: true,
      formatter: function () {
        return `
          <div style="padding: 3px 6px;">
            <div style="font-weight: 700; color: ${this.point.color}; font-size: 12px; margin-bottom: 2px;">
              ● ${this.point.name}
            </div>
            <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 11px;">
              <span>TL Count:</span>
              <span style="font-weight: 700;">${this.y.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 11px; margin-top: 1px;">
              <span>Proportion:</span>
              <span style="font-weight: 700;">${this.percentage.toFixed(1)}%</span>
            </div>
          </div>
        `;
      },
    },
    plotOptions: {
      pie: {
        innerSize: '55%',
        allowPointSelect: true,
        cursor: 'pointer',
        borderWidth: 2,
        borderColor: isDark || isAdmin ? '#0F172A' : '#FFFFFF',
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b><br/>{point.y} ({point.percentage:.1f}%)',
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
        name: 'TL Part Replacements',
        data: dataValues.filter((d) => d.y > 0),
      },
    ],
  };

  return (
    <div className="panel p-4 lg:p-5 flex flex-col justify-between border-t-4 border-t-rose-500 shadow-panel relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 font-bold text-sm">
            TL
          </div>
          <div>
            <h3 className="font-display text-sm lg:text-base font-bold text-ink-950 dark:text-mist-100 flex items-center gap-2">
              Part Replacement — Top Load (TL)
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                {isZero ? '0 Records (FL Uploaded Only)' : 'Active Dataset'}
              </span>
            </h3>
            <p className="text-xs text-ink-500 dark:text-mist-400">
              Ageing distribution for TL washing machine parts {activeDate ? `· ${activeDate}` : ''}
            </p>
          </div>
        </div>

        {/* View Toggle */}
        {!isZero && (
          <div className="flex items-center gap-1 bg-mist-100 dark:bg-ink-800 p-1 rounded-lg border border-mist-300 dark:border-ink-700">
            <button
              onClick={() => setChartType('column')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                chartType === 'column'
                  ? 'bg-white dark:bg-ink-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-ink-600 dark:text-mist-400 hover:text-ink-900 dark:hover:text-mist-200'
              }`}
            >
              Bars
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                chartType === 'pie'
                  ? 'bg-white dark:bg-ink-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-ink-600 dark:text-mist-400 hover:text-ink-900 dark:hover:text-mist-200'
              }`}
            >
              Donut
            </button>
          </div>
        )}
      </div>

      {/* Metric Callout */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-lg p-2.5 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
            Total TL Parts
          </span>
          <span className="font-display text-lg lg:text-xl font-extrabold text-rose-900 dark:text-rose-200">
            {totalTL.toLocaleString()}
          </span>
        </div>
        <div className="bg-mist-50 dark:bg-ink-800/40 border border-mist-200 dark:border-ink-700/60 rounded-lg p-2.5 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600 dark:text-mist-400 block">
            Install Failure
          </span>
          <span className="font-display text-lg lg:text-xl font-extrabold text-ink-900 dark:text-mist-100">
            {(cards[0]?.tlCount ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="bg-mist-50 dark:bg-ink-800/40 border border-mist-200 dark:border-ink-700/60 rounded-lg p-2.5 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600 dark:text-mist-400 block">
            0-3 Months
          </span>
          <span className="font-display text-lg lg:text-xl font-extrabold text-ink-900 dark:text-mist-100">
            {(cards[1]?.tlCount ?? 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Zero State / Informational Overlay when 0 TL records */}
      {isZero ? (
        <div className="relative min-h-[280px] flex flex-col items-center justify-center rounded-xl bg-mist-50/70 dark:bg-ink-950/50 border border-dashed border-rose-300/80 dark:border-rose-900/60 p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-3 shadow-xs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
              <path d="M4 7V4h16v3M9 20h6M12 4v16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h4 className="font-display text-sm font-bold text-ink-900 dark:text-mist-100 mb-1">
            No TL Data Uploaded for This Date
          </h4>
          <p className="text-xs text-ink-500 dark:text-mist-400 max-w-sm mb-3">
            Your database currently holds Front Load (FL) part records for this date. When Top Load (TL) data is uploaded, this graph will automatically render the TL breakdown.
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition-all cursor-pointer shadow-xs"
          >
            <span>📤</span> Upload TL Dataset
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-[280px]">
          <HighchartsReact
            highcharts={Highcharts}
            options={chartType === 'column' ? columnOptions : pieOptions}
          />
        </div>
      )}
    </div>
  );
}
