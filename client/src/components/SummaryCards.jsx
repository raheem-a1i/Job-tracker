// Top-line summary metrics.
export default function SummaryCards({ trends, filteredCount, totalCount }) {
  const topSkill = trends.topSkills?.[0];
  const topRole = trends.roles?.[0];
  const withSalary = trends.salaryByRole?.reduce((n, r) => n + r.count, 0) ?? 0;

  // Overall median salary across all roles that reported one.
  const allMedians = (trends.salaryByRole || []).map((r) => r.median).filter(Boolean);
  const overallMedian = allMedians.length
    ? Math.round(allMedians.reduce((a, b) => a + b, 0) / allMedians.length)
    : null;

  const fmt = (n) => (n == null ? '—' : `$${Math.round(n / 1000)}k`);

  return (
    <div className="cards">
      <div className="card">
        <div className="label">Postings analyzed</div>
        <div className="value">{filteredCount}</div>
        <div className="sub">{filteredCount === totalCount ? 'all sources' : `of ${totalCount} total`}</div>
      </div>
      <div className="card">
        <div className="label">Top skill</div>
        <div className="value">{topSkill?.skill ?? '—'}</div>
        <div className="sub">{topSkill ? `${topSkill.count} postings` : 'no data'}</div>
      </div>
      <div className="card">
        <div className="label">Top role</div>
        <div className="value">{topRole?.label ?? '—'}</div>
        <div className="sub">{topRole ? `${topRole.count} postings` : 'no data'}</div>
      </div>
      <div className="card">
        <div className="label">Median salary</div>
        <div className="value">{fmt(overallMedian)}</div>
        <div className="sub">{withSalary} postings with pay</div>
      </div>
    </div>
  );
}
