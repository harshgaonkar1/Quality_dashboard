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
      labels: { style: { color: '#3E5578', fontSize: '12px' } },
    },
    yAxis: {
      title: { text: null },
      gridLineColor: '#E7ECF3',
      labels: { style: { color: '#3E5578', fontSize: '12px' } },
      allowDecimals: false,
    },
    legend: { enabled: false },
    tooltip: {
      backgroundColor: '#101A2C',
      style: { color: '#F5F7FA' },
      borderRadius: 8,
      borderWidth: 0,
      formatter: function () {
        return `<b>${this.x}</b><br/>${this.y.toLocaleString()} complaints`;
      },
    },
    plotOptions: {
      column: {
        borderRadius: 6,
        color: '#1FB6A6',
        pointPadding: 0.15,
        groupPadding: 0.1,
      },
    },
    series: [
      {
        name: 'Complaints',
        data: cards.map((c) => c.count),
      },
    ],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
