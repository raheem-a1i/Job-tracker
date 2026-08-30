import { useEffect, useState, useCallback, useRef } from 'react';
import './components/chartSetup.js';
import { getStatus, getTrends, getJobs, getSkillGraph, getHistory, startRefresh } from './api.js';
import { useMySkills } from './useMySkills.js';
import Filters from './components/Filters.jsx';
import SummaryCards from './components/SummaryCards.jsx';
import { SeniorityChart, SalaryChart } from './components/Charts.jsx';
import SkillsList from './components/SkillsList.jsx';
import MySkills from './components/MySkills.jsx';
import SkillGap from './components/SkillGap.jsx';
import DemandHistory from './components/DemandHistory.jsx';
import JobsTable from './components/JobsTable.jsx';
import JobFitCoach from './components/JobFitCoach.jsx';

export default function App() {
  const [status, setStatus] = useState(null);
  const [filters, setFilters] = useState({});
  const [trends, setTrends] = useState(null);
  const [facets, setFacets] = useState({});
  const [jobs, setJobs] = useState([]);
  const [jobTotal, setJobTotal] = useState(0);
  const [graph, setGraph] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const mySkills = useMySkills();
  const drillTo = (skill) => setFilters((f) => ({ ...f, skill }));

  // Trends + jobs depend on the active filters.
  const loadData = useCallback(async (activeFilters) => {
    try {
      setError(null);
      const [t, j] = await Promise.all([getTrends(activeFilters), getJobs(activeFilters)]);
      setTrends(t.trends);
      setFacets(t.facets);
      setJobs(j.jobs);
      setJobTotal(j.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Skill graph + history are filter-independent (whole dataset) — load once on
  // mount and again whenever a refresh completes.
  const loadGlobal = useCallback(async () => {
    try {
      const [g, h] = await Promise.all([getSkillGraph(), getHistory()]);
      setGraph(g);
      setHistory(h.history || []);
    } catch (err) {
      /* non-fatal — panels show empty states */
    }
  }, []);

  useEffect(() => {
    getStatus().then(setStatus).catch((e) => setError(e.message));
    loadGlobal();
  }, [loadGlobal]);

  useEffect(() => {
    setLoading(true);
    loadData(filters);
  }, [filters, loadData]);

  // Poll while a refresh runs, then reload everything once it finishes.
  const pollStatus = useCallback(() => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const s = await getStatus();
      setStatus(s);
      if (!s.refreshing) {
        clearInterval(pollRef.current);
        loadData(filters);
        loadGlobal();
      }
    }, 1500);
  }, [filters, loadData, loadGlobal]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const onRefresh = async () => {
    try {
      setError(null);
      await startRefresh();
      setStatus((s) => ({ ...s, refreshing: true }));
      pollStatus();
    } catch (err) {
      setError(err.message);
    }
  };

  const refreshing = status?.refreshing;
  const progress = status?.progress;
  const meta = status?.meta || {};

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Job Market Signal Tracker</h1>
          <p>
            Scrapes live job boards, extracts skills, roles, seniority and salary from
            raw posting text, and surfaces hiring trends — personalized to the skills you track.
          </p>
          <div className="row" style={{ marginTop: 10 }}>
            {status && (
              <span className={`badge ${status.provider === 'claude' ? 'on' : 'off'}`}>
                {status.provider === 'claude'
                  ? `● Claude · ${status.model}`
                  : '● Heuristic extractor'}
              </span>
            )}
            <span className="badge">
              {meta.lastRefresh
                ? `Updated ${new Date(meta.lastRefresh).toLocaleString()}`
                : 'Never refreshed'}
            </span>
            <span className="badge">{history.length} snapshots</span>
            {meta.extraction?.aiFailures > 0 && (
              <span className="badge off">{meta.extraction.aiFailures} AI fallbacks</span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button className="btn" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : '↻ Refresh data'}
          </button>
          {refreshing && progress && (
            <div className="progress" style={{ marginTop: 8 }}>
              {progress.phase}
              {progress.total ? ` ${progress.done}/${progress.total}` : ''}
            </div>
          )}
        </div>
      </header>

      {error && <div className="panel error" style={{ marginBottom: 20 }}>Error: {error}</div>}

      <Filters facets={facets} filters={filters} onChange={setFilters} />

      <JobFitCoach />

      {loading || !trends ? (
        <div className="loading">Loading market signals…</div>
      ) : (
        <>
          <SummaryCards
            trends={trends}
            filteredCount={trends.totalJobs}
            totalCount={status?.meta?.jobCount ?? trends.totalJobs}
          />

          <div className="grid-2">
            <SkillsList
              data={trends.topSkills}
              activeSkill={filters.skill}
              onPick={drillTo}
            />
            <MySkills
              allSkills={status?.allSkills || facets.skills || []}
              skills={mySkills.skills}
              onAdd={mySkills.add}
              onRemove={mySkills.remove}
              full={mySkills.full}
              max={mySkills.max}
              onPick={drillTo}
            />
          </div>

          <div className="grid-2">
            <SkillGap graph={graph} mySkills={mySkills.skills} onPick={drillTo} />
            <DemandHistory history={history} mySkills={mySkills.skills} />
          </div>

          <div className="grid-2">
            <SalaryChart data={trends.salaryByRole} />
            <SeniorityChart data={trends.seniority} />
          </div>

          <div className="panel" style={{ marginBottom: 20 }}>
            <h3>How to read this</h3>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
              Add skills to <strong>My Skills</strong> to unlock personalized features:{' '}
              <strong>Skill gap</strong> recommends what to learn next (skills that pair with yours
              and are in demand), <strong>Demand over time</strong> tracks your skills across
              refreshes, and the postings table scores each job by how many of your skills it needs.
              Click any skill to drill the dashboard into it. Salary bands show the median
              annualized midpoint per role. Signals were extracted by{' '}
              {status?.provider === 'claude'
                ? 'Claude, with a keyword fallback'
                : 'the keyword heuristic'}.
            </p>
          </div>

          <JobsTable jobs={jobs} total={jobTotal} mySkills={mySkills.skills} />
        </>
      )}
    </div>
  );
}
