// ============================================================
// Ageing Chart
// ------------------------------------------------------------
// Highcharts column chart visualizing the count of complaints
// per ageing bucket, reusing the same data as the summary cards.
// ============================================================

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

export default function AgeingChart({ cards }) {
  const options = {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      style: { fontFamily: 'Inter, system-ui, sans-serif' },
      height: 320,
    },
    title: { text: null },
    credits: { enabled: false },
    xAxis: {
      categories: cards.map((c) => c.label),
      lineColor: '#D3DCE8',
      labels: { style: { color: '#3E5578', fontSize: '12px', fontWeight: '500' } },
    },
    yAxis: {
      title: { text: null },
      gridLineColor: '#E7ECF3',
      labels: { style: { color: '#3E5578', fontSize: '12px' } },
      allowDecimals: false,
    },
    legend: {
      enabled: true,
      align: 'right',
      verticalAlign: 'top',
      itemStyle: { color: '#3E5578', fontSize: '12px', fontWeight: '600' },
    },
    tooltip: {
      backgroundColor: '#101A2C',
      style: { color: '#F5F7FA', fontSize: '12px' },
      borderRadius: 8,
      borderWidth: 0,
      shared: true,
      useHTML: true,
      formatter: function () {
        let s = `<div style="font-weight:bold;margin-bottom:6px;">${this.x}</div>`;
        let total = 0;
        this.points.forEach((p) => {
          s += `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:2px;"><span style="color:${p.color}">● ${p.series.name}:</span> <b>${p.y.toLocaleString()}</b></div>`;
          total += p.y;
        });
        s += `<div style="border-top:1px solid #334155;margin-top:6px;padding-top:4px;display:flex;justify-content:space-between;gap:16px;"><span>Total:</span> <b>${total.toLocaleString()}</b></div>`;
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
        color: '#2563EB', // Blue
        data: cards.map((c) => c.flCount ?? c.count ?? 0),
      },
      {
        name: 'TL Models',
        color: '#EF4444', // Red
        data: cards.map((c) => c.tlCount ?? 0),
      },
    ],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
