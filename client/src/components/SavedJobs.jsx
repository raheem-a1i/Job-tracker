// My Job Tracker: jobs saved from the list or added manually, organized by
// status tabs, each with a link to the posting, an editable status, and notes.
import { useMemo, useState } from 'react';
import { JOB_STATUSES } from '../useSavedJobs.js';
import { postingToSavedJob } from '../jobFormat.js';

const TABS = ['All', ...JOB_STATUSES];
const EMPTY_FORM = { title: '', company: '', location: '', salary: '', url: '', status: 'Saved' };

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SavedJobs({ saved, postings = [] }) {
  const [tab, setTab] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [query, setQuery] = useState('');

  // Quick-add: matching postings from the list that aren't already tracked.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return postings
      .filter((p) => !saved.ids.has(p.id) && `${p.title} ${p.company}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, postings, saved.ids]);

  const counts = useMemo(() => {
    const c = { All: saved.jobs.length };
    for (const s of JOB_STATUSES) c[s] = 0;
    for (const j of saved.jobs) c[j.status] = (c[j.status] || 0) + 1;
    return c;
  }, [saved.jobs]);

  const visible = tab === 'All' ? saved.jobs : saved.jobs.filter((j) => j.status === tab);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    saved.add({ id: `manual:${Date.now()}`, ...form, title: form.title.trim() });
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  return (
    <div className="panel tracker">
      <div className="tracker-head">
        <h3 style={{ margin: 0 }}>
          My Job Tracker <span className="muted">({saved.jobs.length})</span>
        </h3>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close' : '＋ Add job'}
        </button>
      </div>

      {showForm && (
        <form className="tracker-form" onSubmit={submit}>
          <label>Job name*<input value={form.title} onChange={setField('title')} placeholder="Backend Engineer" required /></label>
          <label>Company<input value={form.company} onChange={setField('company')} placeholder="Acme" /></label>
          <label>Location<input value={form.location} onChange={setField('location')} placeholder="Remote" /></label>
          <label>Salary<input value={form.salary} onChange={setField('salary')} placeholder="$120k–$150k" /></label>
          <label>Link to posting<input value={form.url} onChange={setField('url')} placeholder="https://…" type="url" /></label>
          <label>
            Status
            <select value={form.status} onChange={setField('status')}>
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <div className="actions">
            <button type="submit" className="btn">Add to tracker</button>
            <button type="button" className="btn secondary" onClick={() => { setForm(EMPTY_FORM); setShowForm(false); }}>Cancel</button>
          </div>
        </form>
      )}

      <div className="tracker-quickadd">
        <input
          type="text"
          placeholder="Quick-add from the postings list — search a title or company…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {matches.length > 0 && (
          <ul className="tracker-quickadd-results">
            {matches.map((p) => (
              <li
                key={p.id}
                onClick={() => {
                  saved.add(postingToSavedJob(p));
                  setQuery('');
                }}
              >
                <span>{p.title} <span className="muted">· {p.company}</span></span>
                <span className="add-plus">＋</span>
              </li>
            ))}
          </ul>
        )}
        {query.trim() && matches.length === 0 && (
          <div className="tracker-quickadd-empty muted">No matching postings (or already tracked).</div>
        )}
      </div>

      <div className="tracker-tabs">
        {TABS.map((t) => (
          <button key={t} className={`tracker-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}<span className="count">{counts[t] ?? 0}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="muted" style={{ fontSize: 13 }}>
          {saved.jobs.length === 0
            ? 'No saved jobs yet — click ☆ Save on a posting below, or use ＋ Add job.'
            : `No jobs in "${tab}".`}
        </div>
      ) : (
        <div className="tracker-list">
          {visible.map((j) => (
            <div key={j.id} className="tracker-job">
              <div className="tracker-job-top">
                <div>
                  <div className="tracker-job-title">
                    {j.url ? (
                      <a href={j.url} target="_blank" rel="noreferrer">{j.title}</a>
                    ) : (
                      <span>{j.title}</span>
                    )}
                  </div>
                  <div className="tracker-job-meta">
                    {[j.company, j.location, j.salary].filter(Boolean).join(' · ') || '—'}
                    {' · '}Added {fmtDate(j.dateAdded)}
                  </div>
                </div>
                <div className="tracker-job-controls">
                  <select value={j.status} onChange={(e) => saved.update(j.id, { status: e.target.value })}>
                    {JOB_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button className="tracker-remove" onClick={() => saved.remove(j.id)} title="Remove" aria-label="Remove">×</button>
                </div>
              </div>
              <textarea
                className="tracker-note"
                value={j.notes}
                onChange={(e) => saved.update(j.id, { notes: e.target.value })}
                placeholder="Add a note (interview date, contact, next step…)"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
