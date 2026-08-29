// Recent postings with their extracted signals, plus a match score against the
// user's My Skills list (share of your skills each posting requires).
import { useMemo, useState } from 'react';

function salaryLabel(s) {
  if (!s || (s.min == null && s.max == null)) return '—';
  const k = (n) => `${Math.round(n / 1000)}k`;
  const cur = s.currency === 'EUR' ? '€' : s.currency === 'GBP' ? '£' : '$';
  if (s.min != null && s.max != null) return `${cur}${k(s.min)}–${cur}${k(s.max)}`;
  return `${cur}${k(s.min ?? s.max)}`;
}

// Comparable annual figure for salary sorting: midpoint of the band, or the
// single bound. Non-annual (hourly/monthly) or missing salaries return null so
// they sort to the bottom in either direction.
function salaryValue(s) {
  if (!s || (s.period && s.period !== 'year')) return null;
  if (s.min != null && s.max != null) return (s.min + s.max) / 2;
  return s.min ?? s.max ?? null;
}

// Order seniority from most junior to most senior for the seniority sort.
const SENIORITY_ORDER = ['Intern', 'Junior', 'Mid', 'Senior', 'Lead', 'Principal'];
const seniorityRank = (s) => SENIORITY_ORDER.indexOf(s);

function relDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const days = (Date.now() - d.getTime()) / 86_400_000;
  if (days < 1) return 'today';
  if (days < 2) return '1d ago';
  if (days < 30) return `${Math.floor(days)}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function JobsTable({ jobs, total, mySkills = [] }) {
  const [sort, setSort] = useState('date'); // date | salary-desc | salary-asc | match
  const [senioritySort, setSenioritySort] = useState('none'); // none | high | low
  const [hideNoSkills, setHideNoSkills] = useState(true);
  const mySet = useMemo(() => new Set(mySkills), [mySkills]);
  const hasSkills = mySkills.length > 0;

  const rows = useMemo(() => {
    const annotated = jobs.map((j) => {
      const skills = j.extraction?.skills || [];
      const matched = skills.filter((s) => mySet.has(s));
      const pct = hasSkills ? Math.round((matched.length / mySkills.length) * 100) : 0;
      return { job: j, matched, matchCount: matched.length, pct };
    });
    const byDate = (a, b) => new Date(b.job.postedAt) - new Date(a.job.postedAt);
    const nullable = (av, bv, dir) => {
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // no value → bottom
      if (bv == null) return -1;
      return (av - bv) * dir;
    };
    // The "Sort" control (date / salary / match).
    const bySort = (a, b) => {
      if (sort === 'match' && hasSkills) return b.pct - a.pct;
      const sal = (r) => salaryValue(r.job.extraction?.salary);
      if (sort === 'salary-desc') return nullable(sal(a), sal(b), -1);
      if (sort === 'salary-asc') return nullable(sal(a), sal(b), 1);
      return byDate(a, b); // 'date'
    };
    // The independent "Seniority" control.
    const bySeniority = (a, b) => {
      const dir = senioritySort === 'high' ? -1 : 1;
      return (seniorityRank(a.job.extraction?.seniority) - seniorityRank(b.job.extraction?.seniority)) * dir;
    };

    // When the seniority sort is active it's the primary key and the Sort
    // control breaks ties, so both apply together. Date is the final tiebreaker.
    annotated.sort((a, b) => {
      if (senioritySort !== 'none') {
        const c = bySeniority(a, b);
        if (c !== 0) return c;
      }
      return bySort(a, b) || byDate(a, b);
    });
    return annotated;
  }, [jobs, mySet, mySkills.length, hasSkills, sort, senioritySort]);

  // Optionally hide postings where no skills were detected (junk / non-tech rows).
  const visible = useMemo(
    () => (hideNoSkills ? rows.filter((r) => (r.job.extraction?.skills?.length || 0) > 0) : rows),
    [rows, hideNoSkills],
  );
  const hiddenCount = rows.length - visible.length;
  const strongMatches = hasSkills ? visible.filter((r) => r.pct >= 60).length : 0;
  const colCount = hasSkills ? 9 : 8;

  return (
    <div className="panel">
      <div className="panel-head">
        <h3 style={{ margin: 0 }}>
          Postings {total != null && <span className="muted">({total})</span>}
          {hasSkills && (
            <span className="muted" style={{ fontWeight: 400 }}> · {strongMatches} strong matches</span>
          )}
        </h3>
        <div className="table-controls">
          <label className="chk">
            <input
              type="checkbox"
              checked={hideNoSkills}
              onChange={(e) => setHideNoSkills(e.target.checked)}
            />
            Hide no-skill jobs
            {hideNoSkills && hiddenCount > 0 && <span className="muted"> ({hiddenCount})</span>}
          </label>
          <label className="sort-ctl">
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="date">Newest</option>
              <option value="salary-desc">Highest salary</option>
              <option value="salary-asc">Lowest salary</option>
              {hasSkills && <option value="match">Best match</option>}
            </select>
          </label>
          <label className="sort-ctl">
            Seniority
            <select value={senioritySort} onChange={(e) => setSenioritySort(e.target.value)}>
              <option value="none">—</option>
              <option value="high">Senior → Junior</option>
              <option value="low">Junior → Senior</option>
            </select>
          </label>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {hasSkills && <th>Match</th>}
              <th>Role / Title</th>
              <th>Company</th>
              <th>Location</th>
              <th>Seniority</th>
              <th>Skills</th>
              <th>Salary</th>
              <th>Posted</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ job: j, matched, matchCount, pct }) => {
              const e = j.extraction || {};
              const matchedSet = new Set(matched);
              const mode = e.workMode && e.workMode !== 'Unknown' ? e.workMode : null;
              return (
                <tr key={j.id}>
                  {hasSkills && (
                    <td>
                      <div className="match-ring" style={{ '--pct': pct }}>
                        <span>{matchCount}/{mySkills.length}</span>
                      </div>
                    </td>
                  )}
                  <td className="title-cell">
                    <div>
                      <span className="pill role">{e.role || '—'}</span>
                      {mode && <span className={`pill mode ${mode.toLowerCase()}`}>{mode}</span>}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      {j.url ? (
                        <a href={j.url} target="_blank" rel="noreferrer">{j.title}</a>
                      ) : (
                        j.title
                      )}
                    </div>
                    {e.summary && <div className="job-summary">{e.summary}</div>}
                  </td>
                  <td>{j.company}</td>
                  <td className="loc-cell">{j.location || '—'}</td>
                  <td>
                    {e.seniority || '—'}
                    {e.experienceYears != null && (
                      <div className="sub-note">{e.experienceYears}+ yrs</div>
                    )}
                  </td>
                  <td>
                    {(e.skills || []).slice(0, 6).map((s) => (
                      <span key={s} className={`pill ${matchedSet.has(s) ? 'match' : ''}`}>{s}</span>
                    ))}
                    {(e.skills || []).length > 6 && (
                      <span className="muted"> +{e.skills.length - 6}</span>
                    )}
                  </td>
                  <td>{salaryLabel(e.salary)}</td>
                  <td className="date-cell">{relDate(j.postedAt)}</td>
                  <td>
                    {j.source}
                    <div className={`tag-by ${e.extractedBy === 'local-ai' ? 'ai' : ''}`}>
                      {e.extractedBy}
                    </div>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={colCount} className="loading">
                  {rows.length > 0 && hideNoSkills
                    ? 'All matching postings have no detected skills — untick "Hide no-skill jobs" to see them.'
                    : 'No postings match these filters'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
