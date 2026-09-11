// ============================================================
// FL Machine Capacity & RPM Chart Component (Graph 3)
// ------------------------------------------------------------
// Visualizes FL Product (Machine) Replacements grouped by
// Capacity (Kg) and Spin Speed (RPM) extracted from the model
// column (e.g., 9014 -> 9kg & 1400rpm, 7012 -> 7kg & 1200rpm,
// 8014, 6512, 6514, etc.) from the product_replacement table.
// ============================================================

import { useMemo, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { aggregateFLModelSpecs } from '../utils/modelSpecParser';
import { useAdmin } from '../context/AdminContext';
import { useTheme } from '../context/ThemeContext';

export default function FLMachineCapacityRPMChart({ rows = [], activeDate = '', loading = false }) {
  const { isAdmin } = useAdmin();
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState('stacked'); // 'stacked' | 'spec_donut' | 'top_models'

  // Aggregation
  const stats = useMemo(() => aggregateFLModelSpecs(rows), [rows]);

  // Theme colors
  const textColor = isAdmin ? '#4ade80' : isDark ? '#F1F5F9' : '#0F172A';
  const subTextColor = isAdmin ? '#22c55e' : isDark ? '#94A3B8' : '#64748B';
  const lineColor = isAdmin ? 'rgba(34, 197, 94, 0.4)' : isDark ? '#1E2D4A' : '#D3DCE8';
  const gridColor = isAdmin ? 'rgba(34, 197, 94, 0.15)' : isDark ? 'rgba(30, 45, 74, 0.6)' : '#E7ECF3';
  const tooltipBg = isAdmin ? '#050505' : isDark ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = isAdmin ? '#22c55e' : isDark ? '#334155' : '#CBD5E1';

  // Distinct RPM palette
  const RPM_PALETTE = {
    '800 RPM': isAdmin ? '#86efac' : '#2DD4BF',
    '1000 RPM': isAdmin ? '#4ade80' : '#38BDF8',
    '1200 RPM': isAdmin ? '#22c55e' : '#818CF8',
    '1400 RPM': isAdmin ? '#16a34a' : '#A855F7',
    '1600 RPM': isAdmin ? '#15803d' : '#EC4899',
    'Other RPM': isAdmin ? '#14532d' : '#94A3B8',
  };

  const SPEC_PALETTE = [
    isAdmin ? '#4ade80' : '#8B5CF6',
    isAdmin ? '#22c55e' : '#3B82F6',
    isAdmin ? '#16a34a' : '#06B6D4',
    isAdmin ? '#15803d' : '#10B981',
    isAdmin ? '#166534' : '#F59E0B',
    isAdmin ? '#14532d' : '#EC4899',
    isAdmin ? '#86efac' : '#6366F1',
    isAdmin ? '#052e16' : '#64748B',
  ];

  // Highcharts Series for Stacked Column (X-axis = Capacities, Series = RPMs)
  const stackedSeries = useMemo(() => {
    const capacities = stats.capacityList;
    const rpms = stats.rpmList;

    return rpms.map((rpmLabel) => {
      const data = capacities.map((capLabel) => {
        return stats.matrix[capLabel]?.[rpmLabel] || 0;
      });

      return {
        name: rpmLabel,
        data,
        color: RPM_PALETTE[rpmLabel] || (isAdmin ? '#4ade80' : '#38BDF8'),
      };
    });
  }, [stats, isAdmin, RPM_PALETTE]);

  // Options: Stacked Column by Capacity x RPM
  const stackedOptions = {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      style: { fontFamily: isAdmin ? '"JetBrains Mono", monospace' : 'Inter, system-ui, sans-serif' },
      height: 310,
      spacingTop: 10,
      spacingBottom: 16,
      spacingLeft: 8,
      spacingRight: 8,
      reflow: true,
    },
    title: { text: null },
    credits: { enabled: false },
    xAxis: {
      categories: stats.capacityList.length > 0 ? stats.capacityList : ['No FL Data'],
      lineColor,
      labels: {
        style: { color: textColor, fontSize: '11px', fontWeight: '700' },
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
      enabled: true,
      align: 'right',
      verticalAlign: 'top',
      itemStyle: { color: textColor, fontSize: '11px', fontWeight: '600' },
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
              Capacity: ${this.x}
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
        s += `
            <div style="border-top: 1px solid ${lineColor}; margin-top: 4px; padding-top: 3px; display: flex; justify-content: space-between; gap: 14px; font-weight: 700;">
              <span>Total for ${this.x}:</span>
              <span>${total.toLocaleString()}</span>
            </div>
          </div>
        `;
        return s;
      },
    },
    plotOptions: {
      column: {
        stacking: 'normal',
        borderRadius: 4,
        pointPadding: 0.15,
        groupPadding: 0.1,
        dataLabels: {
          enabled: true,
          style: {
            color: '#FFFFFF',
            fontSize: '10px',
            fontWeight: 'bold',
            textOutline: 'none',
          },
          formatter: function () {
            return this.y > 0 ? this.y : '';
          },
        },
      },
    },
    series: stackedSeries,
  };

  // Options: Donut by Model Specification
  const donutOptions = {
    chart: {
      type: 'pie',
      backgroundColor: 'transparent',
      style: { fontFamily: isAdmin ? '"JetBrains Mono", monospace' : 'Inter, system-ui, sans-serif' },
      height: 310,
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
              <span>Machine Replacements:</span>
              <span style="font-weight: 700;">${this.y.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 11px; margin-top: 1px;">
              <span>Share:</span>
              <span style="font-weight: 700;">${this.percentage.toFixed(1)}%</span>
            </div>
          </div>
        `;
      },
    },
    plotOptions: {
      pie: {
        innerSize: '50%',
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
          distance: 14,
        },
      },
    },
    series: [
      {
        name: 'Model Specification',
        data: stats.bySpec.map((s, idx) => ({
          name: s.specKey,
          y: s.count,
          color: SPEC_PALETTE[idx % SPEC_PALETTE.length],
        })),
      },
    ],
  };

  const topCapacity = stats.byCapacity[0] || null;
  const topRpm = stats.byRpm.slice().sort((a, b) => b.count - a.count)[0] || null;
  const topSpec = stats.bySpec[0] || null;

  return (
    <div className="panel p-4 lg:p-5 flex flex-col justify-between border-t-4 border-t-purple-500 shadow-panel">
      {/* Header & View Controls */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-500 font-bold text-sm">
            FL
          </div>
          <div>
            <h3 className="font-display text-sm lg:text-base font-bold text-ink-950 dark:text-mist-100 flex items-center gap-2">
              Machine Replacement — FL Capacity & RPM Speed
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-800">
                table: product_replacement
              </span>
            </h3>
            <p className="text-xs text-ink-500 dark:text-mist-400">
              Parsed from model name codes (e.g. 9014 &rarr; 9kg & 1400rpm, 7012 &rarr; 7kg & 1200rpm, 8014, 6512, 6514)
            </p>
          </div>
        </div>

        {/* View Modes */}
        <div className="flex items-center gap-1 bg-mist-100 dark:bg-ink-800 p-1 rounded-lg border border-mist-300 dark:border-ink-700">
          <button
            onClick={() => setViewMode('stacked')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'stacked'
                ? 'bg-white dark:bg-ink-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-ink-600 dark:text-mist-400 hover:text-ink-900 dark:hover:text-mist-200'
            }`}
          >
            Capacity &times; RPM Bars
          </button>
          <button
            onClick={() => setViewMode('spec_donut')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'spec_donut'
                ? 'bg-white dark:bg-ink-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-ink-600 dark:text-mist-400 hover:text-ink-900 dark:hover:text-mist-200'
            }`}
          >
            Spec Donut
          </button>
          <button
            onClick={() => setViewMode('top_models')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'top_models'
                ? 'bg-white dark:bg-ink-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-ink-600 dark:text-mist-400 hover:text-ink-900 dark:hover:text-mist-200'
            }`}
          >
            Top FL Models ({stats.topModels.length})
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-lg p-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 block">
            Total FL Machines
          </span>
          <span className="font-display text-lg lg:text-xl font-extrabold text-purple-900 dark:text-purple-200">
            {stats.totalFLMachines.toLocaleString()}
          </span>
          <span className="text-[10px] text-ink-500 dark:text-mist-400 block mt-0.5">
            {stats.parsedCount} specs decoded
          </span>
        </div>

        <div className="bg-mist-50 dark:bg-ink-800/40 border border-mist-200 dark:border-ink-700/60 rounded-lg p-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600 dark:text-mist-400 block">
            Top Capacity Tier
          </span>
          <span className="font-display text-base lg:text-lg font-bold text-ink-900 dark:text-mist-100 truncate block">
            {topCapacity ? topCapacity.capacityLabel : 'N/A'}
          </span>
          <span className="text-[10px] text-ink-500 dark:text-mist-400 block mt-0.5">
            {topCapacity ? `${topCapacity.count} units (${topCapacity.percentage}%)` : '-'}
          </span>
        </div>

        <div className="bg-mist-50 dark:bg-ink-800/40 border border-mist-200 dark:border-ink-700/60 rounded-lg p-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600 dark:text-mist-400 block">
            Top Spin Speed
          </span>
          <span className="font-display text-base lg:text-lg font-bold text-ink-900 dark:text-mist-100 truncate block">
            {topRpm ? topRpm.rpmLabel : 'N/A'}
          </span>
          <span className="text-[10px] text-ink-500 dark:text-mist-400 block mt-0.5">
            {topRpm ? `${topRpm.count} units (${topRpm.percentage}%)` : '-'}
          </span>
        </div>

        <div className="bg-mist-50 dark:bg-ink-800/40 border border-mist-200 dark:border-ink-700/60 rounded-lg p-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600 dark:text-mist-400 block">
            Leading Specification
          </span>
          <span className="font-display text-base lg:text-lg font-bold text-ink-900 dark:text-mist-100 truncate block" title={topSpec?.specKey}>
            {topSpec ? topSpec.specKey : 'N/A'}
          </span>
          <span className="text-[10px] text-ink-500 dark:text-mist-400 block mt-0.5">
            {topSpec ? `${topSpec.count} units (${topSpec.percentage}%)` : '-'}
          </span>
        </div>
      </div>

      {/* Main Content Area based on View Mode */}
      <div className="flex-1 min-h-[310px]">
        {loading ? (
          <div className="flex items-center justify-center h-full text-ink-500 dark:text-mist-400 text-sm">
            Loading FL machine replacement specifications…
          </div>
        ) : stats.totalFLMachines === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center bg-mist-50/50 dark:bg-ink-950/40 rounded-xl border border-dashed border-mist-300 dark:border-ink-800">
            <span className="text-2xl mb-1">🔍</span>
            <p className="text-xs font-semibold text-ink-700 dark:text-mist-300">
              No FL Machine Replacements found for {activeDate || 'the selected date'}.
            </p>
            <p className="text-[11px] text-ink-500 dark:text-mist-500 mt-1">
              Ensure data has been uploaded to the product_replacement table.
            </p>
          </div>
        ) : viewMode === 'stacked' ? (
          <HighchartsReact highcharts={Highcharts} options={stackedOptions} />
        ) : viewMode === 'spec_donut' ? (
          <HighchartsReact highcharts={Highcharts} options={donutOptions} />
        ) : (
          /* Top FL Models Table */
          <div className="overflow-x-auto max-h-[310px] rounded-lg border border-mist-200 dark:border-ink-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-mist-100 dark:bg-ink-800/80 text-ink-700 dark:text-mist-300 sticky top-0 font-semibold border-b border-mist-200 dark:border-ink-700">
                <tr>
                  <th className="px-3 py-2">Model Name</th>
                  <th className="px-3 py-2">Detected Code</th>
                  <th className="px-3 py-2">Capacity</th>
                  <th className="px-3 py-2">Spin Speed</th>
                  <th className="px-3 py-2 text-right">Replacements</th>
                  <th className="px-3 py-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist-200 dark:divide-ink-800/60 font-mono">
                {stats.topModels.map((m, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-mist-50 dark:hover:bg-ink-800/40 transition-colors"
                  >
                    <td className="px-3 py-2 font-medium text-ink-900 dark:text-mist-100 font-sans">
                      {m.model}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[11px]">
                        {m.matchedCode || 'Manual'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-ink-700 dark:text-mist-300">
                      {m.capacityLabel}
                    </td>
                    <td className="px-3 py-2 text-ink-700 dark:text-mist-300">
                      {m.rpmLabel}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-ink-900 dark:text-mist-100">
                      {m.count.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-purple-600 dark:text-purple-400 font-bold">
                      {m.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
