// Top in-demand skills as a clickable list. Clicking a skill drills the whole
// dashboard into that skill (sets the skill filter).
export default function SkillsList({ data, onPick, activeSkill }) {
  const max = data.length ? Math.max(...data.map((d) => d.count)) : 1;
  return (
    <div className="panel">
      <h3>Top skills in demand</h3>
      {data.length ? (
        <ul className="skill-list">
          {data.map((d) => (
            <li
              key={d.skill}
              className={activeSkill === d.skill ? 'active' : ''}
              onClick={() => onPick?.(d.skill)}
              title={`Filter by ${d.skill}`}
            >
              <span className="skill-name">{d.skill}</span>
              <span className="skill-bar">
                <span className="skill-bar-fill" style={{ width: `${(d.count / max) * 100}%` }} />
              </span>
              <span className="skill-count">{d.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="loading">No data</div>
      )}
    </div>
  );
}
