// Trend computation over the enriched job records. Pure functions over an array
// of jobs so the same code serves the API and the refresh CLI.

const midpoint = (salary) => {
  if (!salary) return null;
  // Only compare annual figures so monthly/hourly don't skew the bands.
  if (salary.period && salary.period !== 'year') return null;
  if (salary.min != null && salary.max != null) return (salary.min + salary.max) / 2;
  return salary.min ?? salary.max ?? null;
};

const median = (nums) => {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

// Apply dashboard filters (role, seniority, source, skill, search) to the set.
export function filterJobs(jobs, { role, seniority, source, skill, q } = {}) {
  return jobs.filter((j) => {
    const e = j.extraction || {};
    if (role && e.role !== role) return false;
    if (seniority && e.seniority !== seniority) return false;
    if (source && j.source !== source) return false;
    if (skill && !(e.skills || []).includes(skill)) return false;
    if (q) {
      const hay = `${j.title} ${j.company} ${(e.skills || []).join(' ')}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });
}

function topSkills(jobs, limit = 15) {
  const counts = new Map();
  for (const j of jobs) {
    for (const skill of j.extraction?.skills || []) {
      counts.set(skill, (counts.get(skill) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function distribution(jobs, key) {
  const counts = new Map();
  for (const j of jobs) {
    const v = j.extraction?.[key] || 'Unknown';
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

// Salary band per role: median of midpoints, plus min/max range.
function salaryByRole(jobs) {
  const byRole = new Map();
  for (const j of jobs) {
    const mid = midpoint(j.extraction?.salary);
    if (mid == null) continue;
    const role = j.extraction?.role || 'Other';
    if (!byRole.has(role)) byRole.set(role, []);
    byRole.get(role).push(mid);
  }
  return [...byRole.entries()]
    .map(([role, vals]) => ({
      role,
      count: vals.length,
      median: median(vals),
      min: Math.round(Math.min(...vals)),
      max: Math.round(Math.max(...vals)),
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => (b.median ?? 0) - (a.median ?? 0));
}

export function computeTrends(jobs) {
  return {
    totalJobs: jobs.length,
    topSkills: topSkills(jobs),
    roles: distribution(jobs, 'role'),
    seniority: distribution(jobs, 'seniority'),
    salaryByRole: salaryByRole(jobs),
  };
}

// Skill co-occurrence graph over the full dataset: how often each skill appears,
// and how often each pair of skills appears together. Powers the gap analysis
// and "next skill to learn" recommendations on the client.
export function computeSkillGraph(jobs) {
  const counts = new Map();
  const pairs = new Map(); // skill -> Map(otherSkill -> co-occurrence count)
  let total = 0;

  const bump = (a, b) => {
    if (!pairs.has(a)) pairs.set(a, new Map());
    const m = pairs.get(a);
    m.set(b, (m.get(b) || 0) + 1);
  };

  for (const j of jobs) {
    const skills = [...new Set(j.extraction?.skills || [])];
    if (skills.length === 0) continue;
    total++;
    for (const s of skills) counts.set(s, (counts.get(s) || 0) + 1);
    for (let a = 0; a < skills.length; a++) {
      for (let b = a + 1; b < skills.length; b++) {
        bump(skills[a], skills[b]);
        bump(skills[b], skills[a]);
      }
    }
  }

  const pairsObj = {};
  for (const [k, m] of pairs) pairsObj[k] = Object.fromEntries(m);
  return { total, counts: Object.fromEntries(counts), pairs: pairsObj };
}

// A compact point-in-time snapshot of skill demand, appended to history on each
// refresh so we can chart genuine demand-over-time.
export function buildSnapshot(jobs) {
  const skills = {};
  for (const j of jobs) {
    for (const s of new Set(j.extraction?.skills || [])) {
      skills[s] = (skills[s] || 0) + 1;
    }
  }
  return { date: new Date().toISOString(), totalJobs: jobs.length, skills };
}

// Facet values for populating the dashboard filter dropdowns.
export function computeFacets(jobs) {
  const roles = new Set();
  const seniority = new Set();
  const sources = new Set();
  const skills = new Set();
  for (const j of jobs) {
    if (j.extraction?.role) roles.add(j.extraction.role);
    if (j.extraction?.seniority) seniority.add(j.extraction.seniority);
    if (j.source) sources.add(j.source);
    for (const s of j.extraction?.skills || []) skills.add(s);
  }
  return {
    roles: [...roles].sort(),
    seniority: [...seniority].sort(),
    sources: [...sources].sort(),
    skills: [...skills].sort(),
  };
}
