// Demand-over-time line chart, built from dated snapshots recorded on each
// refresh. Plots the user's My Skills when set, otherwise the overall top skills.
import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { PALETTE } from './chartSetup.js';

function pickSkills(history, mySkills) {
  if (mySkills.length) return mySkills;
  // Otherwise, the 5 highest-demand skills in the latest snapshot.
  const latest = history[history.length - 1]?.skills || {};
  return Object.entries(latest)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([s]) => s);
}

export default function DemandHistory({ history = [], mySkills = [] }) {
  const skills = useMemo(() => pickSkills(history, mySkills), [history, mySkills]);

  const data = useMemo(() => {
    const labels = history.map((h) =>
      new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    );
    return {
      labels,
      datasets: skills.map((skill, i) => ({
        label: skill,
        data: history.map((h) => h.skills?.[skill] || 0),
        borderColor: PALETTE[i % PALETTE.length],
        backgroundColor: PALETTE[i % PALETTE.length],
        tension: 0.3,
        pointRadius: history.length > 30 ? 0 : 3,
        borderWidth: 2,
      })),
    };
  }, [history, skills]);

  const options = {
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8 } } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#222634' }, beginAtZero: true, title: { display: true, text: 'postings' } },
    },
  };

  return (
    <div className="panel">
      <h3>
        Demand over time{' '}
        <span className="muted">{mySkills.length ? '· your skills' : '· top skills'}</span>
      </h3>
      <div className="chart-wrap">
        {history.length >= 2 ? (
          <Line data={data} options={options} />
        ) : (
          <div className="loading">
            {history.length === 1
              ? 'Only one snapshot so far — refresh again (ideally on another day) to see trends.'
              : 'No history yet. Refresh to record the first snapshot.'}
          </div>
        )}
      </div>
    </div>
  );
}
