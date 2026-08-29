// Skill gap analysis + "next skill to learn" recommendations.
// Uses the server's co-occurrence graph and the user's My Skills list to score
// candidate skills by how often they pair with skills the user already has,
// blended with overall market demand.
import { useMemo } from 'react';

const TOP_N = 15; // "top in-demand" set used for the coverage metric

function recommend(graph, mySkills, k = 6) {
  const { counts = {}, pairs = {} } = graph || {};
  const have = new Set(mySkills);
  const maxCount = Math.max(1, ...Object.values(counts));

  return Object.keys(counts)
    .filter((s) => !have.has(s))
    .map((skill) => {
      const demandNorm = counts[skill] / maxCount;

      // Relatedness: average P(skill | mySkill) across the user's skills, and
      // remember the strongest single pairing to explain the recommendation.
      let relSum = 0;
      let bestWith = null;
      let bestP = 0;
      for (const ms of mySkills) {
        const base = counts[ms] || 0;
        const p = base ? (pairs[ms]?.[skill] || 0) / base : 0;
        relSum += p;
        if (p > bestP) {
          bestP = p;
          bestWith = ms;
        }
      }
      const rel = mySkills.length ? relSum / mySkills.length : 0;
      const score = mySkills.length ? 0.65 * rel + 0.35 * demandNorm : demandNorm;

      return {
        skill,
        score,
        demand: counts[skill],
        bestWith,
        bestPct: Math.round(bestP * 100),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export default function SkillGap({ graph, mySkills, onPick }) {
  const recs = useMemo(() => recommend(graph, mySkills), [graph, mySkills]);

  const topInDemand = useMemo(() => {
    const counts = graph?.counts || {};
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([skill]) => skill);
  }, [graph]);

  const haveTop = topInDemand.filter((s) => mySkills.includes(s)).length;

  return (
    <div className="panel">
      <h3>Skill gap &amp; recommendations</h3>

      {mySkills.length === 0 ? (
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Add skills to <strong>My Skills</strong> to get personalized recommendations. Until then,
          here are the most in-demand skills to consider:
          <div className="my-skills-chips" style={{ marginTop: 12 }}>
            {topInDemand.slice(0, 6).map((s) => (
              <button key={s} className="pill role" onClick={() => onPick?.(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="coverage">
            You have <strong>{haveTop}</strong> of the top {TOP_N} in-demand skills.
            <div className="coverage-bar">
              <span style={{ width: `${(haveTop / TOP_N) * 100}%` }} />
            </div>
          </div>

          <div className="rec-label">Next skills to learn</div>
          <ul className="rec-list">
            {recs.map((r) => (
              <li key={r.skill}>
                <button className="rec-skill" onClick={() => onPick?.(r.skill)} title={`Filter by ${r.skill}`}>
                  {r.skill}
                </button>
                <span className="rec-why">
                  {r.bestWith && r.bestPct > 0
                    ? `pairs with ${r.bestWith} (${r.bestPct}% of ${r.bestWith} roles)`
                    : `${r.demand} postings`}
                </span>
              </li>
            ))}
            {recs.length === 0 && <li className="muted">No recommendations yet.</li>}
          </ul>
        </>
      )}
    </div>
  );
}
