// Thin fetch wrappers around the backend API.

function qs(filters = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v) params.set(k, v);
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function getStatus() {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error('status failed');
  return res.json();
}

export async function getTrends(filters) {
  const res = await fetch(`/api/trends${qs(filters)}`);
  if (!res.ok) throw new Error('trends failed');
  return res.json();
}

export async function getJobs(filters) {
  const res = await fetch(`/api/jobs${qs({ ...filters, limit: 1000 })}`);
  if (!res.ok) throw new Error('jobs failed');
  return res.json();
}

export async function getSkillGraph() {
  const res = await fetch('/api/skill-graph');
  if (!res.ok) throw new Error('skill-graph failed');
  return res.json();
}

export async function getHistory() {
  const res = await fetch('/api/history');
  if (!res.ok) throw new Error('history failed');
  return res.json();
}

export async function startRefresh() {
  const res = await fetch('/api/refresh', { method: 'POST' });
  if (res.status === 409) throw new Error('A refresh is already running');
  if (!res.ok) throw new Error('refresh failed');
  return res.json();
}
