// Chart panels: seniority mix (bar) and salary bands by role (horizontal bar).
import { Bar } from 'react-chartjs-2';
import { PALETTE } from './chartSetup.js';

const noLegend = { plugins: { legend: { display: false } }, maintainAspectRatio: false };

export function SeniorityChart({ data }) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [{ data: data.map((d) => d.count), backgroundColor: PALETTE[2], borderRadius: 4 }],
  };
  const options = {
    ...noLegend,
    scales: { x: { grid: { display: false } }, y: { grid: { color: '#222634' } } },
  };
  return (
    <div className="panel">
      <h3>Seniority mix</h3>
      <div className="chart-wrap">
        {data.length ? <Bar data={chartData} options={options} /> : <Empty />}
      </div>
    </div>
  );
}

export function SalaryChart({ data }) {
  const chartData = {
    labels: data.map((d) => d.role),
    datasets: [
      {
        label: 'Median (annual)',
        data: data.map((d) => d.median),
        backgroundColor: PALETTE[1],
        borderRadius: 4,
      },
    ],
  };
  const options = {
    ...noLegend,
    indexAxis: 'y',
    scales: {
      x: {
        grid: { color: '#222634' },
        ticks: { callback: (v) => `$${Math.round(v / 1000)}k` },
      },
      y: { grid: { display: false } },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const d = data[ctx.dataIndex];
            return `Median $${Math.round(d.median / 1000)}k  (range $${Math.round(
              d.min / 1000,
            )}k–$${Math.round(d.max / 1000)}k, n=${d.count})`;
          },
        },
      },
    },
  };
  return (
    <div className="panel">
      <h3>Salary bands by role</h3>
      <div className="chart-wrap">
        {data.length ? <Bar data={chartData} options={options} /> : <Empty msg="No salary data in this view" />}
      </div>
    </div>
  );
}

function Empty({ msg = 'No data' }) {
  return <div className="loading">{msg}</div>;
}
