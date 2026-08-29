// Interactive filter bar. Lifts state up to App via onChange.
export default function Filters({ facets, filters, onChange }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });
  const clear = () => onChange({});

  const select = (key, label, options) => (
    <label>
      {label}
      <select value={filters[key] || ''} onChange={set(key)}>
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="filters">
      <label className="grow">
        Search
        <input
          type="text"
          placeholder="title, company, or skill…"
          value={filters.q || ''}
          onChange={set('q')}
        />
      </label>
      {select('role', 'Role', facets.roles || [])}
      {select('seniority', 'Seniority', facets.seniority || [])}
      {select('skill', 'Skill', facets.skills || [])}
      {select('source', 'Source', facets.sources || [])}
      <button className="btn secondary clear" onClick={clear} disabled={!hasFilters}>
        Clear
      </button>
    </div>
  );
}
