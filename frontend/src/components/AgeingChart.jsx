// ============================================================
// Ageing Chart
// ------------------------------------------------------------
// Highcharts column chart visualizing the count of complaints
// per ageing bucket, reusing the same data as the summary cards.
// ============================================================

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useAdmin } from '../context/AdminContext';

export default function AgeingChart({ cards }) {
  const { isAdmin } = useAdmin();

  const textColor = isAdmin ? '#4ade80' : '#3E5578';
  const lineColor = isAdmin ? 'rgba(34, 197, 94, 0.4)' : '#D3DCE8';
  const gridColor = isAdmin ? 'rgba(34, 197, 94, 0.15)' : '#E7ECF3';
  const flColor = isAdmin ? '#4ade80' : '#2563EB';
  const tlColor = isAdmin ? '#15803d' : '#EF4444';
  const tooltipBg = isAdmin ? '#050505' : '#101A2C';
  const tooltipBorder = isAdmin ? '#22c55e' : '#101A2C';

  const options = {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      style: { fontFamily: isAdmin ? '"JetBrains Mono", monospace' : 'Inter, system-ui, sans-serif' },
      height: 320,
    },
    title: { text: null },
    credits: { enabled: false },
    xAxis: {
      categories: cards.map((c) => c.label),
      lineColor: lineColor,
      labels: { style: { color: textColor, fontSize: '12px', fontWeight: '500' } },
    },
    yAxis: {
      title: { text: null },
      gridLineColor: gridColor,
      labels: { style: { color: textColor, fontSize: '12px' } },
      allowDecimals: false,
    },
    legend: {
      enabled: true,
      align: 'right',
      verticalAlign: 'top',
      itemStyle: { color: textColor, fontSize: '12px', fontWeight: '600' },
    },
    tooltip: {
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: isAdmin ? 1 : 0,
      style: { color: isAdmin ? '#4ade80' : '#F5F7FA', fontSize: '12px' },
      borderRadius: 8,
      shared: true,
      useHTML: true,
      formatter: function () {
        let s = `<div style="font-weight:bold;margin-bottom:6px;color:${textColor}">${this.x}</div>`;
        let total = 0;
        this.points.forEach((p) => {
          s += `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:2px;"><span style="color:${p.color}">● ${p.series.name}:</span> <b>${p.y.toLocaleString()}</b></div>`;
          total += p.y;
        });
        s += `<div style="border-top:1px solid ${lineColor};margin-top:6px;padding-top:4px;display:flex;justify-content:space-between;gap:16px;"><span>Total:</span> <b>${total.toLocaleString()}</b></div>`;
        return s;
      },
    },
    plotOptions: {
      column: {
        stacking: 'normal',
        borderRadius: 4,
        pointPadding: 0.15,
        groupPadding: 0.1,
      },
    },
    series: [
      {
        name: 'FL Models',
        color: flColor,
        data: cards.map((c) => c.flCount ?? c.count ?? 0),
      },
      {
        name: 'TL Models',
        color: tlColor,
        data: cards.map((c) => c.tlCount ?? 0),
      },
    ],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

