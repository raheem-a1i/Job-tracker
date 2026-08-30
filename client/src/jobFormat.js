// Shared formatting helpers for postings, used by the table and the tracker.

export function salaryLabel(s) {
  if (!s || (s.min == null && s.max == null)) return '—';
  const k = (n) => `${Math.round(n / 1000)}k`;
  const cur = s.currency === 'EUR' ? '€' : s.currency === 'GBP' ? '£' : '$';
  if (s.min != null && s.max != null) return `${cur}${k(s.min)}–${cur}${k(s.max)}`;
  return `${cur}${k(s.min ?? s.max)}`;
}

// Build a job-tracker record from a posting.
export function postingToSavedJob(job) {
  const label = salaryLabel(job.extraction?.salary);
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location || '',
    salary: label === '—' ? '' : label,
    url: job.url || '',
  };
}
