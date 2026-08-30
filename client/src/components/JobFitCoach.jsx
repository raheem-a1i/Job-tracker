// Job Fit Coach panel: pick a posting, compare it to My Skills via Claude.
import { useEffect, useState } from 'react';
import { getJobs, getJobFit } from '../api.js';

// Read the up-to-5 skills the user saved in My Skills (from localStorage).
function readSavedSkills() {
  try {
    const parsed = JSON.parse(localStorage.getItem('jmt.mySkills') || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((skill) => typeof skill === 'string').slice(0, 5)
      : [];
  } catch {
    return [];
  }
}

// One result card (Strengths, Gaps, etc.) showing a bullet list.
function ResultList({ title, items }) {
  return (
    <section className="jobfit-card">
      <h4>{title}</h4>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">None identified.</p>
      )}
    </section>
  );
}

export default function JobFitCoach() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [skillsUsed, setSkillsUsed] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  // Load the postings to populate the dropdown (and keep the current pick).
  async function loadJobs() {
    try {
      setLoadingJobs(true);
      setError('');
      const data = await getJobs({});
      const nextJobs = data.jobs || [];
      setJobs(nextJobs);
      setSelectedJobId((current) => current || nextJobs[0]?.id || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingJobs(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  // Send the chosen job + saved skills to the server for a Claude analysis.
  async function handleAnalyze() {
    const savedSkills = readSavedSkills();
    setSkillsUsed(savedSkills);
    setAnalysis(null);
    setError('');

    if (!selectedJobId) {
      setError('Choose a job first');
      return;
    }
    if (savedSkills.length === 0) {
      setError('Add at least one item to My Skills below, then try again');
      return;
    }

    try {
      setAnalyzing(true);
      const result = await getJobFit(selectedJobId, savedSkills);
      setAnalysis(result.analysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <section className="panel jobfit" aria-labelledby="job-fit-heading">
      <h3 id="job-fit-heading">Claude Job Fit Coach</h3>
      <p className="jobfit-sub">
        Pick a posting and compare it against the skills saved in My Skills. Your Claude API key
        stays on the server.
      </p>

      <div className="jobfit-controls">
        <label>
          Job posting
          <select
            value={selectedJobId}
            onChange={(event) => {
              setSelectedJobId(event.target.value);
              setAnalysis(null);
            }}
            disabled={loadingJobs || jobs.length === 0}
          >
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} at {job.company}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="btn secondary" onClick={loadJobs} disabled={loadingJobs}>
          {loadingJobs ? 'Loading…' : 'Reload jobs'}
        </button>

        <button type="button" className="btn" onClick={handleAnalyze} disabled={analyzing || loadingJobs}>
          {analyzing ? 'Analyzing…' : 'Analyze job fit'}
        </button>
      </div>

      {skillsUsed.length > 0 && (
        <p className="jobfit-skills muted">Skills used: {skillsUsed.join(', ')}</p>
      )}
      {error && (
        <p className="jobfit-error" role="alert">
          {error}
        </p>
      )}

      {/* Claude's result: a verdict + summary, then four detail cards. */}
      {analysis && (
        <div className="jobfit-results">
          <section className="jobfit-verdict">
            <h4>{analysis.fitVerdict}</h4>
            <p>{analysis.summary}</p>
          </section>
          <div className="jobfit-cards">
            <ResultList title="Strengths" items={analysis.strengths} />
            <ResultList title="Gaps" items={analysis.gaps} />
            <ResultList title="Interview talking points" items={analysis.interviewTalkingPoints} />
            <ResultList title="Preparation plan" items={analysis.preparationPlan} />
          </div>
        </div>
      )}
    </section>
  );
}
