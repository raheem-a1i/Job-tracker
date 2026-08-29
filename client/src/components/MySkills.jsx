// Personal focus list: search the full skill taxonomy and save up to 5 skills
// you want to work on. State is owned by App (useMySkills) and persisted to
// localStorage, so it's shared with the gap analysis and job match features.
import { useState, useMemo } from 'react';

export default function MySkills({ allSkills = [], skills, onAdd, onRemove, full, max, onPick }) {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allSkills
      .filter((s) => s.toLowerCase().includes(q) && !skills.includes(s))
      .slice(0, 8);
  }, [query, allSkills, skills]);

  const add = (skill) => {
    onAdd(skill);
    setQuery('');
  };

  return (
    <div className="panel">
      <h3>
        My Skills <span className="muted">({skills.length}/{max})</span>
      </h3>
      <p className="muted" style={{ fontSize: 12, marginTop: -8, marginBottom: 12 }}>
        Your focus list — the top skills you want to work on. Saved in this browser and used for
        recommendations and job match below.
      </p>

      <div className="skill-search">
        <input
          type="text"
          placeholder={full ? 'Remove one to add more…' : 'Search skills to add…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={full}
        />
        {matches.length > 0 && (
          <ul className="skill-search-results">
            {matches.map((s) => (
              <li key={s} onClick={() => add(s)}>
                {s} <span className="add-plus">＋</span>
              </li>
            ))}
          </ul>
        )}
        {query.trim() && matches.length === 0 && !full && (
          <div className="skill-search-empty">No matching skills</div>
        )}
      </div>

      {skills.length ? (
        <div className="my-skills-chips">
          {skills.map((s) => (
            <span key={s} className="pill picked">
              <button className="chip-label" onClick={() => onPick?.(s)} title={`Filter by ${s}`}>
                {s}
              </button>
              <button className="chip-x" onClick={() => onRemove(s)} title="Remove" aria-label={`Remove ${s}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="muted" style={{ fontSize: 13 }}>
          No skills yet — search above to add up to {max}.
        </div>
      )}
    </div>
  );
}
