// ============================================================
// FL Part Replacement Chart Component (Graph 1)
// ------------------------------------------------------------
// Visualizes Front Load (FL) Part Replacement ageing distribution
// and failure metrics for the latest date data using Highcharts.
// Supports column and donut view modes with theme adaptivity.
// ============================================================

import { useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useAdmin } from '../context/AdminContext';
import { useTheme } from '../context/ThemeContext';

export default function FLPartReplacementChart({ cards = [], total = 0, flCount = 0, activeDate = '' }) {
  const { isAdmin } = useAdmin();
  const { isDark } = useTheme();
  const [chartType, setChartType] = useState('column'); // 'column' | 'pie'

  // Colors
  const textColor = isAdmin ? '#4ade80' : isDark ? '#F1F5F9' : '#0F172A';
  const subTextColor = isAdmin ? '#22c55e' : isDark ? '#94A3B8' : '#64748B';
  const lineColor = isAdmin ? 'rgba(34, 197, 94, 0.4)' : isDark ? '#1E2D4A' : '#D3DCE8';
  const gridColor = isAdmin ? 'rgba(34, 197, 94, 0.15)' : isDark ? 'rgba(30, 45, 74, 0.6)' : '#E7ECF3';
  const tooltipBg = isAdmin ? '#050505' : isDark ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = isAdmin ? '#22c55e' : isDark ? '#334155' : '#CBD5E1';

  // Palette matching the bright vivid scheme: 0d Bright Orange, 0-3M Bright Green, 1Y Bright Red, 2Y Bright Blue, 3Y Bright Yellow, 4Y Bright Purple, >4Y Bright Indigo
  const flBarColors = [
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
    y: c.flCount ?? c.count ?? 0,
    color: flBarColors[i % flBarColors.length],
  }));

  const totalFL = flCount || dataValues.reduce((sum, d) => sum + d.y, 0);

  const columnOptions = {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      style: { fontFamily: isAdmin ? '"JetBrains Mono", monospace' : 'Inter, system-ui, sans-serif' },
      height: 290,
      spacingTop: 8,
      spacingBottom: 24,
      spacingLeft: 8,
      spacingRight: 8,
      reflow: true,
    },
    title: { text: null },
    credits: { enabled: false },
    xAxis: {
      categories,
      lineColor,
      labels: {
        rotation: -25,
        align: 'right',
        reserveSpace: true,
        y: 4,
        style: { color: subTextColor, fontSize: '10.5px', fontWeight: '600' },
      },
    },
    yAxis: {
      title: { text: null },
      gridLineColor: gridColor,
      labels: { style: { color: subTextColor, fontSize: '11px' } },
      allowDecimals: false,
    },
    legend: { enabled: false },
    tooltip: {
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      borderRadius: 8,
      shadow: true,
      style: { color: textColor, fontSize: '11px' },
      useHTML: true,
      formatter: function () {
        const pct = totalFL > 0 ? ((this.y / totalFL) * 100).toFixed(1) : '0.0';
        return `
          <div style="padding: 3px 6px;">
            <div style="font-weight: 700; color: ${this.point.color}; font-size: 12px; margin-bottom: 3px;">
              ● ${this.x}
            </div>
            <div style="display: flex; justify-content: space-between; gap: 14px; font-size: 11px;">
              <span>FL Replacements:</span>
              <span style="font-weight: 700;">${this.y.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 14px; font-size: 11px; margin-top: 2px;">
              <span>Share of FL:</span>
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
          enabled: true,
          style: {
            color: textColor,
            fontSize: '11px',
            fontWeight: '700',
            textOutline: 'none',
          },
          formatter: function () {
            return this.y > 0 ? this.y : '';
          },
        },
      },
    },
    series: [
      {
        name: 'FL Part Replacements',
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
              <span>FL Count:</span>
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
        name: 'FL Part Replacements',
        data: dataValues.filter((d) => d.y > 0),
      },
    ],
  };

  return (
    <div className="panel p-4 lg:p-5 flex flex-col justify-between border-t-4 border-t-sky-500 shadow-panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-500 font-bold text-sm">
            FL
          </div>
          <div>
            <h3 className="font-display text-sm lg:text-base font-bold text-ink-950 dark:text-mist-100 flex items-center gap-2">
              Part Replacement — Front Load (FL)
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-300 dark:border-sky-800">
                Primary Dataset
              </span>
            </h3>
            <p className="text-xs text-ink-500 dark:text-mist-400">
              Ageing distribution for FL washing machine parts {activeDate ? `· ${activeDate}` : ''}
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-mist-100 dark:bg-ink-800 p-1 rounded-lg border border-mist-300 dark:border-ink-700">
          <button
            onClick={() => setChartType('column')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              chartType === 'column'
                ? 'bg-white dark:bg-ink-900 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-ink-600 dark:text-mist-400 hover:text-ink-900 dark:hover:text-mist-200'
            }`}
          >
            Bars
          </button>
          <button
            onClick={() => setChartType('pie')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              chartType === 'pie'
                ? 'bg-white dark:bg-ink-900 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-ink-600 dark:text-mist-400 hover:text-ink-900 dark:hover:text-mist-200'
            }`}
          >
            Donut
          </button>
        </div>
      </div>

      {/* Metric Callout */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 rounded-lg p-2.5 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 block">
            Total FL Parts
          </span>
          <span className="font-display text-lg lg:text-xl font-extrabold text-sky-900 dark:text-sky-200">
            {totalFL.toLocaleString()}
          </span>
        </div>
        <div className="bg-mist-50 dark:bg-ink-800/40 border border-mist-200 dark:border-ink-700/60 rounded-lg p-2.5 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600 dark:text-mist-400 block">
            Install Failure
          </span>
          <span className="font-display text-lg lg:text-xl font-extrabold text-ink-900 dark:text-mist-100">
            {(cards[0]?.flCount ?? cards[0]?.count ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="bg-mist-50 dark:bg-ink-800/40 border border-mist-200 dark:border-ink-700/60 rounded-lg p-2.5 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600 dark:text-mist-400 block">
            0-3 Months
          </span>
          <span className="font-display text-lg lg:text-xl font-extrabold text-ink-900 dark:text-mist-100">
            {(cards[1]?.flCount ?? cards[1]?.count ?? 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 min-h-[280px]">
        <HighchartsReact
          highcharts={Highcharts}
          options={chartType === 'column' ? columnOptions : pieOptions}
        />
      </div>
    </div>
  );
}
